from typing import Any

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncConnection

from .. import tables
from ..core.embedder import Embedder
from ..core.registry import Registry
from .dependencies import get_conn, get_embedder, get_registry
from .schemas import (
    FilterCondition,
    MultiQuerySearchRequest,
    MultiQuerySearchResponse,
    SearchableFieldResponse,
    SearchRequest,
    SearchResponse,
    SearchResult,
    TopKSearchRequest,
    TopKSearchResponse,
    TopKSearchResult,
)

router = APIRouter(tags=["search"])

# ── Searchable fields ────────────────────────────────────────────────────────

fields_router = APIRouter(prefix="/searchable-fields", tags=["searchable-fields"])


@fields_router.get("", response_model=list[SearchableFieldResponse])
async def list_searchable_fields(
    conn: AsyncConnection = Depends(get_conn),
) -> list[SearchableFieldResponse]:
    rows = (await conn.execute(sa.select(tables.searchable_fields))).mappings().all()
    return [SearchableFieldResponse(**dict(r)) for r in rows]


# ── Search ───────────────────────────────────────────────────────────────────

@router.post("/search", response_model=SearchResponse)
async def search(
    body: SearchRequest,
    conn: AsyncConnection = Depends(get_conn),
    embedder: Embedder = Depends(get_embedder),
) -> SearchResponse:
    query_vector = (await embedder.aembed([body.query_text]))[0]

    field_map = await _load_field_map(conn)
    filter_clauses = _build_filters(body.filters, field_map)

    emb = tables.embeddings
    doc = tables.documents
    ext = tables.extractors

    distance_col = sa.cast(emb.c.embedding.op("<->")(query_vector), sa.Float).label("distance")

    from_clause = emb.join(doc, emb.c.document_id == doc.c.id).join(ext, emb.c.extractor_id == ext.c.id)
    where_clause = [ext.c.name.in_(body.extractor_names), doc.c.deleted == False, *filter_clauses]
    if body.doc_url:
        where_clause.append(doc.c.url.ilike(body.doc_url))
    columns = [
        doc.c.id.label("document_id"),
        doc.c.url,
        doc.c.data,
        doc.c.verified,
        ext.c.name.label("extractor_name"),
        emb.c.subkey,
        distance_col,
    ]

    if body.distinct_by_document:
        inner = (
            sa.select(*columns)
            .distinct(doc.c.id)
            .select_from(from_clause)
            .where(*where_clause)
            .order_by(doc.c.id, distance_col)
        ).subquery()
        q = sa.select(inner).order_by(inner.c.distance).limit(body.limit).offset(body.offset)
    else:
        q = (
            sa.select(*columns)
            .select_from(from_clause)
            .where(*where_clause)
            .order_by(distance_col)
            .limit(body.limit)
            .offset(body.offset)
        )

    rows = (await conn.execute(q)).mappings().all()
    results = [
        SearchResult(
            document_id=r["document_id"],
            url=r["url"],
            data=r["data"],
            verified=r["verified"],
            extractor_name=r["extractor_name"],
            subkey=r["subkey"],
            distance=float(r["distance"]),
        )
        for r in rows
    ]
    return SearchResponse(results=results, total=len(results))


@router.post("/search/top-k", response_model=TopKSearchResponse)
async def search_top_k(
    body: TopKSearchRequest,
    conn: AsyncConnection = Depends(get_conn),
    embedder: Embedder = Depends(get_embedder),
) -> TopKSearchResponse:
    query_vector = (await embedder.aembed([body.query_text]))[0]

    field_map = await _load_field_map(conn)
    filter_clauses = _build_filters(body.filters, field_map)

    emb = tables.embeddings
    doc = tables.documents
    ext = tables.extractors

    distance_col = sa.cast(emb.c.embedding.op("<->")(query_vector), sa.Float).label("distance")

    ranked = (
        sa.select(
            doc.c.id.label("document_id"),
            doc.c.url,
            doc.c.data,
            doc.c.verified,
            emb.c.subkey,
            distance_col,
            sa.func.row_number().over(
                partition_by=doc.c.id,
                order_by=distance_col,
            ).label("rank"),
        )
        .select_from(
            emb
            .join(doc, emb.c.document_id == doc.c.id)
            .join(ext, emb.c.extractor_id == ext.c.id)
        )
        .where(ext.c.name.in_(body.extractor_names), doc.c.deleted == False,
               *([doc.c.url.ilike(body.doc_url)] if body.doc_url else []), *filter_clauses)
    ).cte("ranked")

    mean_distance = sa.func.avg(ranked.c.distance).label("mean_distance")
    subkeys = sa.func.array_agg(
        sa.text("ranked.subkey ORDER BY ranked.distance")
    ).label("subkeys")

    q = (
        sa.select(
            ranked.c.document_id,
            ranked.c.url,
            ranked.c.data,
            ranked.c.verified,
            subkeys,
            mean_distance,
        )
        .where(ranked.c.rank <= body.k)
        .group_by(
            ranked.c.document_id,
            ranked.c.url,
            ranked.c.data,
            ranked.c.verified,
        )
        .order_by(mean_distance)
        .limit(body.limit)
        .offset(body.offset)
    )

    rows = (await conn.execute(q)).mappings().all()
    results = [
        TopKSearchResult(
            document_id=r["document_id"],
            url=r["url"],
            data=r["data"],
            verified=r["verified"],
            subkeys=r["subkeys"] or [],
            mean_distance=float(r["mean_distance"]),
        )
        for r in rows
    ]
    return TopKSearchResponse(results=results, total=len(results))


@router.post("/search/multi-query", response_model=MultiQuerySearchResponse)
async def search_multi_query(
    body: MultiQuerySearchRequest,
    conn: AsyncConnection = Depends(get_conn),
    embedder: Embedder = Depends(get_embedder),
) -> MultiQuerySearchResponse:
    vectors = await embedder.aembed(body.query_texts)
    field_map = await _load_field_map(conn)
    filter_clauses = _build_filters(body.filters, field_map)

    emb = tables.embeddings
    doc = tables.documents
    ext = tables.extractors

    where_base = [ext.c.name.in_(body.extractor_names), doc.c.deleted == False, *filter_clauses]
    if body.doc_url:
        where_base.append(doc.c.url.ilike(body.doc_url))

    def make_min_dist_cte(vector: list[float], name: str, extra_where: list = []) -> Any:
        dist = sa.cast(emb.c.embedding.op("<->")(vector), sa.Float)
        return (
            sa.select(
                doc.c.id.label("document_id"),
                sa.func.min(dist).label("min_distance"),
            )
            .select_from(emb.join(doc, emb.c.document_id == doc.c.id).join(ext, emb.c.extractor_id == ext.c.id))
            .where(*where_base, *extra_where)
            .group_by(doc.c.id)
        ).cte(name)

    # Step 1: top N candidates by closest embedding to first query
    first_scores = make_min_dist_cte(vectors[0], "first_scores")
    candidates = (
        sa.select(first_scores.c.document_id)
        .order_by(first_scores.c.min_distance)
        .limit(body.candidate_limit)
    ).cte("candidates")

    # Step 2: for each query vector, min distance per candidate document
    candidate_filter = [doc.c.id.in_(sa.select(candidates.c.document_id))]
    union_parts = [
        sa.select(scores.c.document_id, scores.c.min_distance.label("query_dist"))
        for scores in (
            make_min_dist_cte(vector, f"scores_{i}", candidate_filter)
            for i, vector in enumerate(vectors)
        )
    ]

    all_scores = sa.union_all(*union_parts).subquery("all_scores")

    # Step 3: average per-query distances, join documents, paginate
    final = (
        sa.select(
            all_scores.c.document_id,
            sa.func.avg(all_scores.c.query_dist).label("mean_distance"),
        )
        .group_by(all_scores.c.document_id)
        .order_by(sa.func.avg(all_scores.c.query_dist))
        .limit(body.limit)
        .offset(body.offset)
    ).subquery("final")

    q = (
        sa.select(
            final.c.document_id,
            doc.c.url,
            doc.c.data,
            doc.c.verified,
            final.c.mean_distance,
        )
        .select_from(final.join(doc, final.c.document_id == doc.c.id))
        .order_by(final.c.mean_distance)
    )

    rows = (await conn.execute(q)).mappings().all()
    results = [
        TopKSearchResult(
            document_id=r["document_id"],
            url=r["url"],
            data=r["data"],
            verified=r["verified"],
            subkeys=[],
            mean_distance=float(r["mean_distance"]),
        )
        for r in rows
    ]
    return MultiQuerySearchResponse(results=results, total=len(results))


# ── helpers ──────────────────────────────────────────────────────────────────

async def _load_field_map(conn: AsyncConnection) -> dict[str, dict]:
    rows = (await conn.execute(sa.select(tables.searchable_fields))).mappings().all()
    return {r["name"]: dict(r) for r in rows}


def _build_filters(
    conditions: list[FilterCondition],
    field_map: dict[str, dict],
) -> list[Any]:
    clauses = []
    for cond in conditions:
        field = field_map.get(cond.field)
        if field is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown searchable field: '{cond.field}'",
            )
        expr = _json_expr(field["json_path"], field["field_type"])
        clauses.append(_apply_op(expr, cond.operator, cond.value))
    return clauses


def _json_expr(json_path: str, field_type: str) -> Any:
    parts = json_path.split(".")
    col = tables.documents.c.data
    for part in parts[:-1]:
        col = col[part]
    text_expr = col[parts[-1]].astext
    if field_type == "number":
        return sa.cast(text_expr, sa.Numeric)
    if field_type == "boolean":
        return sa.cast(text_expr, sa.Boolean)
    return text_expr



def _apply_op(expr: Any, operator: str, value: Any) -> Any:
    if operator == "eq":
        return expr == value
    if operator == "neq":
        return expr != value
    if operator == "gt":
        return expr > value
    if operator == "gte":
        return expr >= value
    if operator == "lt":
        return expr < value
    if operator == "lte":
        return expr <= value
    if operator == "contains":
        return expr.ilike(f"%{value}%")
    if operator == "ilike":
        return expr.ilike(value)
    if operator == "in":
        return expr.in_(value)
    raise HTTPException(status_code=400, detail=f"Unknown operator: '{operator}'")
