import type {
  DocumentEmbeddingItem,
  ExtractorInfo,
  MultiQuerySearchRequest,
  MultiQuerySearchResponse,
  SearchableField,
  SearchRequest,
  SearchResponse,
  TopKSearchRequest,
  TopKSearchResponse,
} from "@/types/api"

export interface DocumentUpsert {
  url?: string | null
  data: Record<string, unknown>
  verified?: boolean | null
}

async function apiFetch<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

export function createApiClient(baseUrl: string) {
  return {
    getExtractors: () =>
      apiFetch<ExtractorInfo[]>(baseUrl, "/extractors"),

    getSearchableFields: () =>
      apiFetch<SearchableField[]>(baseUrl, "/searchable-fields"),

    search: (req: SearchRequest) =>
      apiFetch<SearchResponse>(baseUrl, "/search", {
        method: "POST",
        body: JSON.stringify(req),
      }),

    searchTopK: (req: TopKSearchRequest) =>
      apiFetch<TopKSearchResponse>(baseUrl, "/search/top-k", {
        method: "POST",
        body: JSON.stringify(req),
      }),

    searchMultiQuery: (req: MultiQuerySearchRequest) =>
      apiFetch<MultiQuerySearchResponse>(baseUrl, "/search/multi-query", {
        method: "POST",
        body: JSON.stringify(req),
      }),

    upsertDocument: (doc: DocumentUpsert) =>
      apiFetch<{ id: string }>(baseUrl, "/documents", {
        method: "POST",
        body: JSON.stringify(doc),
      }),

    getDocumentEmbeddings: (docId: string) =>
      apiFetch<DocumentEmbeddingItem[]>(baseUrl, `/documents/${docId}/embeddings`),

    embedDocument: (data: Record<string, unknown>) =>
      apiFetch<DocumentEmbeddingItem[]>(baseUrl, `/documents/embed`, {
        method: "POST",
        body: JSON.stringify({ data }),
      }),

    embedTexts: (texts: string[]) =>
      apiFetch<DocumentEmbeddingItem[]>(baseUrl, `/documents/embed-text`, {
        method: "POST",
        body: JSON.stringify({ texts }),
      }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
