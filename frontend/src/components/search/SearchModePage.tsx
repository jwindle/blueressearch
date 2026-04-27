"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { backends } from "@/config/backends"
import { createApiClient } from "@/lib/api"
import { SearchForm } from "./SearchForm"
import { SearchResults } from "./SearchResults"
import { TopKResults } from "./TopKResults"
import type { ExtractorInfo, SearchableField, SearchResult, TopKSearchResult, FilterCondition } from "@/types/api"

interface SearchParams {
  query: string
  extractorNames: string[]
  filters: FilterCondition[]
  distinctByDocument: boolean
  k: number
  docUrl: string
}

interface Props {
  backendId: string
  mode: string
  initialQ: string
  initialExtractors: string[] | null
  initialDistinct: boolean
  initialK: number
  initialFilters: FilterCondition[]
  initialDocUrl: string
  pinnedId: string | null
}

export function SearchModePage({
  backendId,
  mode,
  initialQ,
  initialExtractors,
  initialDistinct,
  initialK,
  initialFilters,
  initialDocUrl,
  pinnedId,
}: Props) {
  const router = useRouter()
  const backend = backends.find(b => b.id === backendId)

  const [extractors, setExtractors] = useState<ExtractorInfo[]>([])
  const [fields, setFields] = useState<SearchableField[]>([])
  const [standardResults, setStandardResults] = useState<SearchResult[]>([])
  const [topKResults, setTopKResults] = useState<TopKSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!backend) return
    const client = createApiClient(backend.url)
    Promise.all([client.getExtractors(), client.getSearchableFields()])
      .then(([exts, flds]) => {
        setExtractors(exts)
        setFields(flds)
      })
      .catch(e => setMetaError(String(e)))
  }, [backend])

  const runSearch = useCallback(async (params: SearchParams) => {
    if (!backend || !params.query.trim() || params.extractorNames.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const client = createApiClient(backend.url)
      if (mode === "top-k") {
        const res = await client.searchTopK({
          query_text: params.query,
          extractor_names: params.extractorNames,
          filters: params.filters,
          doc_url: params.docUrl || null,
          k: params.k,
          limit: 20,
        })
        setTopKResults(res.results)
        setStandardResults([])
      } else {
        const res = await client.search({
          query_text: params.query,
          extractor_names: params.extractorNames,
          filters: params.filters,
          doc_url: params.docUrl || null,
          distinct_by_document: params.distinctByDocument,
          limit: 20,
        })
        setStandardResults(res.results)
        setTopKResults([])
      }
      setHasSearched(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [backend, mode])

  function handleSearch(params: SearchParams) {
    const sp = new URLSearchParams()
    if (params.query) sp.set("q", params.query)
    if (params.extractorNames.length < extractors.length) {
      sp.set("extractors", params.extractorNames.join(","))
    }
    if (mode === "top-k" && params.k !== 3) sp.set("k", String(params.k))
    if (params.filters.length > 0) sp.set("filters", JSON.stringify(params.filters))
    if (params.docUrl) sp.set("doc_url", params.docUrl)
    if (pinnedId) sp.set(backendId === "resumes" ? "job" : "resume", pinnedId)
    const qs = sp.toString()
    router.replace(`/search/${backendId}/${mode}${qs ? `?${qs}` : ""}`, { scroll: false })
    runSearch(params)
  }

  if (!backend) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>
        Backend &ldquo;{backendId}&rdquo; not found.
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">{backend.name}</h1>
        {backend.atCollection && (
          <Link
            href={`/add/${backendId}`}
            className="text-sm hover:opacity-70 transition-opacity shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            + Add documents
          </Link>
        )}
      </div>

      {backend.searchModes.length > 1 && (
        <div className="flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
          {backend.searchModes.map(m => (
            <Link
              key={m.id}
              href={`/search/${backendId}/${m.id}${initialQ ? `?q=${encodeURIComponent(initialQ)}` : ""}`}
              className="px-3 py-2 text-sm -mb-px border-b-2 transition-colors"
              style={{
                borderColor: m.id === mode ? "var(--accent)" : "transparent",
                color: m.id === mode ? "var(--accent)" : "var(--muted-foreground)",
              }}
            >
              {m.name}
            </Link>
          ))}
        </div>
      )}

      {metaError && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
          Could not load backend metadata: {metaError}
        </div>
      )}

      <SearchForm
        extractors={extractors}
        fields={fields}
        onSearch={handleSearch}
        loading={loading}
        mode={mode}
        initialValues={{
          query: initialQ,
          extractorNames: initialExtractors ?? undefined,
          distinctByDocument: initialDistinct,
          filters: initialFilters,
          k: initialK,
          docUrl: initialDocUrl,
        }}
        autoSearch={!!initialQ}
        runSearch={runSearch}
      />

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
          {error}
        </div>
      )}

      {hasSearched && mode !== "top-k" && (
        <SearchResults results={standardResults} extractors={extractors} DocumentCard={backend.DocumentCard} backendId={backendId} pinnedId={pinnedId} />
      )}
      {hasSearched && mode === "top-k" && (
        <TopKResults results={topKResults} DocumentCard={backend.DocumentCard} backendId={backendId} pinnedId={pinnedId} />
      )}
    </div>
  )
}
