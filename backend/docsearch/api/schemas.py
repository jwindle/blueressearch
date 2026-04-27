from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, computed_field


# ── Documents ────────────────────────────────────────────────────────────────

class DocumentUpsert(BaseModel):
    url: str | None = None
    data: dict[str, Any]
    verified: bool | None = None


class EmbedRequest(BaseModel):
    data: dict[str, Any]


class DocumentResponse(BaseModel):
    id: UUID
    url: str | None
    data: dict[str, Any]
    verified: bool | None
    deleted: bool


# ── Extractors (read-only — defined in code, registered at startup) ───────────

class ExtractorResponse(BaseModel):
    name: str
    class_name: str
    keys: list[str]
    config: dict | None = None


# ── Searchable fields ────────────────────────────────────────────────────────

class SearchableFieldCreate(BaseModel):
    name: str
    json_path: str
    field_type: Literal["string", "number", "boolean"]
    index_type: Literal["btree", "trgm"] = "btree"
    description: str | None = None


class SearchableFieldResponse(BaseModel):
    id: UUID
    name: str
    json_path: str
    field_type: str
    index_type: str
    description: str | None

    @computed_field
    @property
    def suggested_operators(self) -> list[str]:
        if self.field_type == "number":
            return ["eq", "neq", "gt", "gte", "lt", "lte", "in"]
        if self.field_type == "boolean":
            return ["eq", "neq"]
        if self.index_type == "trgm":
            return ["ilike"]
        return ["eq", "neq", "gt", "gte", "lt", "lte", "in"]


# ── Search ───────────────────────────────────────────────────────────────────

FilterOperator = Literal["eq", "neq", "gt", "gte", "lt", "lte", "contains", "ilike", "in"]


class FilterCondition(BaseModel):
    field: str
    operator: FilterOperator
    value: Any


class SearchRequest(BaseModel):
    query_text: str
    extractor_names: list[str]
    filters: list[FilterCondition] = []
    doc_url: str | None = None
    limit: int = 10
    offset: int = 0
    distinct_by_document: bool = False


class SearchResult(BaseModel):
    document_id: UUID
    url: str | None
    data: dict[str, Any]
    verified: bool | None
    extractor_name: str
    subkey: str | None
    distance: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int


class TopKSearchRequest(BaseModel):
    query_text: str
    extractor_names: list[str]
    k: int = 3
    filters: list[FilterCondition] = []
    doc_url: str | None = None
    limit: int = 10
    offset: int = 0


class TopKSearchResult(BaseModel):
    document_id: UUID
    url: str | None
    data: dict[str, Any]
    verified: bool | None
    subkeys: list[str | None]
    mean_distance: float


class TopKSearchResponse(BaseModel):
    results: list[TopKSearchResult]
    total: int


# ── Document embeddings ──────────────────────────────────────────────────────

class DocumentEmbeddingItem(BaseModel):
    extractor_name: str
    subkey: str | None
    text: str
    embedding: list[float]


# ── Admin ────────────────────────────────────────────────────────────────────

class VectorIndexCreate(BaseModel):
    index_type: Literal["vector_hnsw", "vector_ivfflat"]
    extractor_name: str
    hnsw_m: int = 16
    hnsw_ef_construction: int = 64
    ivfflat_lists: int = 100


class VectorIndexResponse(BaseModel):
    index_name: str
    index_type: str
    created: bool
