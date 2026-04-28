export interface ExtractorInfo {
  name: string
  class_name: string
  keys: string[]
  config: Record<string, unknown> | null
}

export interface SearchableField {
  id: string
  name: string
  json_path: string
  field_type: string
  index_type: string
  description: string | null
  suggested_operators: string[]
}

export interface FilterCondition {
  field: string
  operator: string
  value: unknown
}

export interface SearchRequest {
  query_text: string
  extractor_names: string[]
  filters?: FilterCondition[]
  doc_url?: string | null
  limit?: number
  offset?: number
  distinct_by_document?: boolean
}

export interface TopKSearchRequest {
  query_text: string
  extractor_names: string[]
  k?: number
  filters?: FilterCondition[]
  doc_url?: string | null
  limit?: number
  offset?: number
}

export interface SearchResult {
  document_id: string
  url: string | null
  data: unknown
  verified: boolean | null
  extractor_name: string
  subkey: string | null
  distance: number
}

export interface TopKSearchResult {
  document_id: string
  url: string | null
  data: unknown
  verified: boolean | null
  subkeys: (string | null)[]
  mean_distance: number
}

export interface DocumentResponse {
  id: string
  url: string | null
  data: unknown
  verified: boolean | null
  deleted: boolean
}

export interface DocumentEmbeddingItem {
  extractor_name: string
  subkey: string | null
  text: string
  embedding: number[]
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export interface TopKSearchResponse {
  results: TopKSearchResult[]
  total: number
}

export interface MultiQuerySearchRequest {
  query_texts: string[]
  extractor_names: string[]
  candidate_limit?: number
  filters?: FilterCondition[]
  doc_url?: string | null
  limit?: number
  offset?: number
}

export interface MultiQuerySearchResponse {
  results: TopKSearchResult[]
  total: number
}
