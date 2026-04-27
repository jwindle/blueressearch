"""
Admin endpoints:
  POST /admin/init          — create all tables (idempotent) + sync registry to DB
  POST /admin/reextract     — re-run all extractors on every document
  POST /admin/purge-all     — hard-delete all documents and embeddings (cascade)
  POST /admin/gc            — hard-delete documents marked deleted=true (cascade)
  POST /admin/vector-indexes — create an HNSW or IVFFlat index on the embeddings table
  POST /admin/searchable-fields — create or update a searchable field and its DB index
  DELETE /admin/searchable-fields/{name} — delete a searchable field and its DB index
"""

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from .. import tables
from ..core.embedder import Embedder
from ..core.registry import Registry
from .dependencies import get_conn, get_embedder, get_registry
from .schemas import SearchableFieldCreate, SearchableFieldResponse, VectorIndexCreate, VectorIndexResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/init", status_code=200)
async def initialize_db(
    conn: AsyncConnection = Depends(get_conn),
    registry: Registry = Depends(get_registry),
    embedder: Embedder = Depends(get_embedder),
) -> dict:
    for stmt in tables.get_create_tables_sql(embedder.dimension):
        await conn.execute(sa.text(stmt))
    await registry.sync_to_db(conn)
    return {"status": "ok"}


@router.post("/reextract", status_code=200)
async def reextract_all(
    conn: AsyncConnection = Depends(get_conn),
    registry: Registry = Depends(get_registry),
    embedder: Embedder = Depends(get_embedder),
) -> dict:
    from .documents import _run_extractors

    rows = (await conn.execute(sa.select(tables.documents.c.id, tables.documents.c.data))).mappings().all()
    for row in rows:
        await _run_extractors(conn, row["id"], row["data"], registry, embedder)
    return {"processed": len(rows)}


@router.post("/purge-all", status_code=200)
async def purge_all_documents(
    conn: AsyncConnection = Depends(get_conn),
) -> dict:
    result = await conn.execute(sa.delete(tables.documents))
    return {"deleted": result.rowcount}


@router.post("/gc", status_code=200)
async def gc_deleted_documents(
    conn: AsyncConnection = Depends(get_conn),
) -> dict:
    result = await conn.execute(
        sa.delete(tables.documents).where(tables.documents.c.deleted == True)
    )
    return {"collected": result.rowcount}


@router.post("/searchable-fields", response_model=SearchableFieldResponse, status_code=201)
async def create_searchable_field(
    body: SearchableFieldCreate,
    conn: AsyncConnection = Depends(get_conn),
) -> SearchableFieldResponse:
    stmt = (
        pg_insert(tables.searchable_fields)
        .values(**body.model_dump())
        .on_conflict_do_update(
            index_elements=["name"],
            set_={
                "json_path": body.json_path,
                "field_type": body.field_type,
                "index_type": body.index_type,
                "description": body.description,
            },
        )
        .returning(tables.searchable_fields)
    )
    row = (await conn.execute(stmt)).mappings().one()
    await recreate_field_index(conn, body.name, body.json_path, body.index_type)
    return SearchableFieldResponse(**dict(row))


@router.delete("/searchable-fields/{name}", status_code=204)
async def delete_searchable_field(
    name: str,
    conn: AsyncConnection = Depends(get_conn),
) -> None:
    result = await conn.execute(
        sa.delete(tables.searchable_fields).where(tables.searchable_fields.c.name == name)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Field not found")
    await drop_field_indexes(conn, name)


@router.post("/vector-indexes", response_model=VectorIndexResponse)
async def create_vector_index(
    body: VectorIndexCreate,
    conn: AsyncConnection = Depends(get_conn),
) -> VectorIndexResponse:
    index_name, ddl = _build_vector_index_ddl(body)
    try:
        await conn.execute(sa.text(ddl))
        created = True
    except Exception as exc:
        if "already exists" in str(exc).lower():
            created = False
        else:
            raise HTTPException(status_code=500, detail=str(exc))
    return VectorIndexResponse(index_name=index_name, index_type=body.index_type, created=created)


# ── helpers ──────────────────────────────────────────────────────────────────

async def recreate_field_index(
    conn: AsyncConnection, name: str, json_path: str, index_type: str
) -> None:
    safe = name.replace(".", "_").replace("-", "_")
    await conn.execute(sa.text(f"DROP INDEX IF EXISTS idx_doc_data_{safe}"))
    await conn.execute(sa.text(f"DROP INDEX IF EXISTS idx_doc_data_{safe}_trgm"))
    parts = json_path.split(".")
    path_expr = "data" + "".join(f"->'{p}'" for p in parts[:-1]) + f"->>'{parts[-1]}'"
    if index_type == "trgm":
        ddl = f"CREATE INDEX IF NOT EXISTS idx_doc_data_{safe}_trgm ON documents USING gin (({path_expr}) gin_trgm_ops)"
    else:
        ddl = f"CREATE INDEX IF NOT EXISTS idx_doc_data_{safe} ON documents (({path_expr}))"
    await conn.execute(sa.text(ddl))


async def drop_field_indexes(conn: AsyncConnection, name: str) -> None:
    safe = name.replace(".", "_").replace("-", "_")
    await conn.execute(sa.text(f"DROP INDEX IF EXISTS idx_doc_data_{safe}"))
    await conn.execute(sa.text(f"DROP INDEX IF EXISTS idx_doc_data_{safe}_trgm"))


def _build_vector_index_ddl(body: VectorIndexCreate) -> tuple[str, str]:
    safe = body.extractor_name.replace(":", "_").replace("-", "_").replace(".", "_")

    if body.index_type == "vector_hnsw":
        index_name = f"idx_emb_{safe}_hnsw"
        ddl = (
            f"CREATE INDEX IF NOT EXISTS {index_name} ON embeddings "
            f"USING hnsw (embedding vector_l2_ops) "
            f"WITH (m = {body.hnsw_m}, ef_construction = {body.hnsw_ef_construction})"
        )
    else:
        index_name = f"idx_emb_{safe}_ivfflat"
        ddl = (
            f"CREATE INDEX IF NOT EXISTS {index_name} ON embeddings "
            f"USING ivfflat (embedding vector_l2_ops) "
            f"WITH (lists = {body.ivfflat_lists})"
        )
    return index_name, ddl
