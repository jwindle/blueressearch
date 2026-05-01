from uuid import UUID

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from .. import tables
from ..core.embedder import Embedder
from ..core.registry import Registry
from .dependencies import get_conn, get_embedder, get_registry
from .schemas import DocumentEmbeddingItem, DocumentResponse, DocumentUpsert, EmbedRequest, EmbedTextsRequest

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=201)
async def upsert_document(
    body: DocumentUpsert,
    conn: AsyncConnection = Depends(get_conn),
    registry: Registry = Depends(get_registry),
    embedder: Embedder = Depends(get_embedder),
) -> DocumentResponse:
    doc_id = await _upsert_doc(conn, body)
    await _run_extractors(conn, doc_id, body.data, registry, embedder)
    row = (
        await conn.execute(
            sa.select(tables.documents).where(tables.documents.c.id == doc_id)
        )
    ).mappings().one()
    return DocumentResponse(id=row["id"], url=row["url"], data=row["data"], verified=row["verified"], deleted=row["deleted"])


@router.post("/embed", response_model=list[DocumentEmbeddingItem])
async def embed_document(
    body: EmbedRequest,
    registry: Registry = Depends(get_registry),
    embedder: Embedder = Depends(get_embedder),
) -> list[DocumentEmbeddingItem]:
    result: list[DocumentEmbeddingItem] = []
    for extractor in registry.extractors.values():
        pairs = extractor.extract_texts(body.data)
        if not pairs:
            continue
        texts = [t for t, _ in pairs]
        subkeys = [s for _, s in pairs]
        vectors = await embedder.aembed(texts)
        for text, subkey, embedding in zip(texts, subkeys, vectors):
            result.append(DocumentEmbeddingItem(
                extractor_name=extractor.name,
                subkey=subkey,
                text=text,
                embedding=list(embedding),
            ))
    return result


@router.post("/embed-text", response_model=list[DocumentEmbeddingItem])
async def embed_texts(
    body: EmbedTextsRequest,
    embedder: Embedder = Depends(get_embedder),
) -> list[DocumentEmbeddingItem]:
    vectors = await embedder.aembed(body.texts)
    return [
        DocumentEmbeddingItem(extractor_name="text", subkey=str(i), text=text, embedding=list(vector))
        for i, (text, vector) in enumerate(zip(body.texts, vectors))
    ]


@router.delete("/{doc_id}", status_code=200)
async def soft_delete_document(
    doc_id: UUID,
    conn: AsyncConnection = Depends(get_conn),
) -> dict:
    result = await conn.execute(
        sa.update(tables.documents)
        .where(tables.documents.c.id == doc_id)
        .values(deleted=True)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": True}


@router.delete("", status_code=200)
async def soft_delete_document_by_url(
    url: str = Query(..., min_length=1),
    conn: AsyncConnection = Depends(get_conn),
) -> dict:
    result = await conn.execute(
        sa.update(tables.documents)
        .where(tables.documents.c.url == url)
        .values(deleted=True, updated_at=sa.func.now())
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": True}


@router.get("/{doc_id}/embeddings", response_model=list[DocumentEmbeddingItem])
async def get_document_embeddings(
    doc_id: UUID,
    conn: AsyncConnection = Depends(get_conn),
    registry: Registry = Depends(get_registry),
) -> list[DocumentEmbeddingItem]:
    doc_row = (
        await conn.execute(
            sa.select(tables.documents.c.data).where(tables.documents.c.id == doc_id)
        )
    ).mappings().one_or_none()
    if doc_row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    data = doc_row["data"]

    rows = (
        await conn.execute(
            sa.select(
                tables.extractors.c.name.label("extractor_name"),
                tables.embeddings.c.subkey,
                tables.embeddings.c.embedding,
            )
            .join(tables.extractors, tables.embeddings.c.extractor_id == tables.extractors.c.id)
            .where(tables.embeddings.c.document_id == doc_id)
        )
    ).mappings().all()

    result: list[DocumentEmbeddingItem] = []
    for row in rows:
        extractor = registry.extractors.get(row["extractor_name"])
        if extractor is None:
            continue
        text_map = {s: t for t, s in extractor.extract_texts(data)}
        text = text_map.get(row["subkey"])
        if text is None:
            continue
        result.append(DocumentEmbeddingItem(
            extractor_name=row["extractor_name"],
            subkey=row["subkey"],
            text=text,
            embedding=list(row["embedding"]),
        ))

    return result


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: UUID,
    conn: AsyncConnection = Depends(get_conn),
) -> DocumentResponse:
    row = (
        await conn.execute(
            sa.select(tables.documents).where(tables.documents.c.id == doc_id)
        )
    ).mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(id=row["id"], url=row["url"], data=row["data"], verified=row["verified"], deleted=row["deleted"])


# ── helpers ──────────────────────────────────────────────────────────────────

async def _upsert_doc(conn: AsyncConnection, body: DocumentUpsert) -> UUID:
    stmt = pg_insert(tables.documents).values(url=body.url, data=body.data, verified=body.verified)
    if body.url:
        stmt = stmt.on_conflict_do_update(
            index_elements=["url"],
            set_={
                "data": stmt.excluded.data,
                "verified": stmt.excluded.verified,
                "deleted": False,
                "updated_at": sa.func.now(),
            },
        )
    else:
        stmt = stmt.on_conflict_do_nothing()
    result = await conn.execute(stmt.returning(tables.documents.c.id))
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=409, detail="Conflict inserting document")
    return row[0]


async def _run_extractors(
    conn: AsyncConnection, doc_id: UUID, data: dict, registry: Registry, embedder: Embedder
) -> None:
    extractor_ids = dict(
        (await conn.execute(sa.select(tables.extractors.c.name, tables.extractors.c.id))).all()
    )

    for extractor in registry.extractors.values():
        extractor_id = extractor_ids.get(extractor.name)
        if extractor_id is None:
            continue

        pairs = extractor.extract_texts(data)
        if not pairs:
            continue

        texts = [t for t, _ in pairs]
        subkeys = [s for _, s in pairs]
        vectors = await embedder.aembed(texts)

        await conn.execute(
            sa.delete(tables.embeddings).where(
                tables.embeddings.c.document_id == doc_id,
                tables.embeddings.c.extractor_id == extractor_id,
            )
        )

        await conn.execute(
            sa.insert(tables.embeddings),
            [
                {
                    "document_id": doc_id,
                    "extractor_id": extractor_id,
                    "embedding": vector,
                    "subkey": subkey,
                }
                for vector, subkey in zip(vectors, subkeys)
            ],
        )
