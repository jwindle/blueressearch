"use client"

import { useState, useEffect, useRef } from "react"
import type { ExtractorInfo, SearchableField, FilterCondition } from "@/types/api"
import { FilterBuilder } from "./FilterBuilder"
import { resolveHandleToDid } from "@/lib/did"

interface SearchParams {
  query: string
  extractorNames: string[]
  filters: FilterCondition[]
  distinctByDocument: boolean
  k: number
  docUrl: string
}

interface InitialValues {
  query?: string
  extractorNames?: string[]
  distinctByDocument?: boolean
  filters?: FilterCondition[]
  k?: number
  docUrl?: string
}

interface Props {
  extractors: ExtractorInfo[]
  fields: SearchableField[]
  onSearch: (params: SearchParams) => void
  loading: boolean
  mode?: string
  initialValues?: InitialValues
  autoSearch?: boolean
  runSearch?: (params: SearchParams) => void
}

export function SearchForm({
  extractors,
  fields,
  onSearch,
  loading,
  mode = "standard",
  initialValues,
  autoSearch,
  runSearch,
}: Props) {
  const [query, setQuery] = useState(initialValues?.query ?? "")
  const [selectedExtractors, setSelectedExtractors] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterCondition[]>(initialValues?.filters ?? [])
  const [k, setK] = useState(initialValues?.k ?? 3)
  const [authorInput, setAuthorInput] = useState(initialValues?.docUrl ?? "")
  const [authorDid, setAuthorDid] = useState(initialValues?.docUrl ?? "")
  const [authorResolving, setAuthorResolving] = useState(false)
  const [authorFailed, setAuthorFailed] = useState(false)
  const autoSearched = useRef(false)

  useEffect(() => {
    if (extractors.length === 0) return
    const allNames = extractors.map(e => e.name)
    const initial = initialValues?.extractorNames
    const names = initial
      ? initial.filter(n => allNames.includes(n))
      : allNames
    setSelectedExtractors(names.length > 0 ? names : allNames)

    if (autoSearch && !autoSearched.current && query.trim()) {
      autoSearched.current = true
      const params: SearchParams = {
        query,
        extractorNames: names.length > 0 ? names : allNames,
        filters,
        distinctByDocument: true,
        k,
        docUrl: authorDid,
      }
      ;(runSearch ?? onSearch)(params)
    }
  }, [extractors])

  function toggleExtractor(name: string) {
    setSelectedExtractors(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  async function resolveAuthor(raw: string) {
    const trimmed = raw.trim().replace(/^@/, "")
    if (!trimmed) { setAuthorDid(""); return }
    if (trimmed.startsWith("did:")) { setAuthorDid(`%${trimmed}%`); return }
    setAuthorResolving(true)
    setAuthorFailed(false)
    const did = await resolveHandleToDid(trimmed)
    setAuthorResolving(false)
    if (did) {
      setAuthorDid(`%${did}%`)
    } else {
      setAuthorFailed(true)
      setAuthorDid("")
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || selectedExtractors.length === 0) return
    onSearch({ query, extractorNames: selectedExtractors, filters, distinctByDocument: true, k, docUrl: authorDid })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 text-sm rounded border px-3 py-2"
          style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim() || selectedExtractors.length === 0}
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {extractors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Search within
          </p>
          <div className="flex flex-wrap gap-2">
            {extractors.map(e => (
              <button
                key={e.name}
                type="button"
                onClick={() => toggleExtractor(e.name)}
                className="text-xs px-2.5 py-1 rounded-full border transition-opacity"
                style={{
                  borderColor: selectedExtractors.includes(e.name) ? "var(--accent)" : "var(--border)",
                  color: selectedExtractors.includes(e.name) ? "var(--accent)" : "var(--muted-foreground)",
                  background: "var(--muted)",
                }}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Author
        </p>
        <input
          value={authorInput}
          onChange={e => { setAuthorInput(e.target.value); setAuthorFailed(false); setAuthorDid("") }}
          onBlur={e => resolveAuthor(e.target.value)}
          onKeyDown={e => e.key === "Enter" && resolveAuthor(authorInput)}
          placeholder={authorResolving ? "resolving…" : authorFailed ? "handle not found" : "handle or DID (optional)"}
          disabled={authorResolving}
          className="w-full text-sm rounded border px-3 py-2"
          style={{
            background: "var(--muted)",
            borderColor: authorFailed ? "#ef4444" : "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {fields.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Filters
          </p>
          <FilterBuilder fields={fields} filters={filters} onChange={setFilters} />
        </div>
      )}

      {mode === "top-k" && (
        <label className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--muted-foreground)" }}>Top K per document:</span>
          <input
            type="number"
            min={1}
            max={20}
            value={k}
            onChange={e => setK(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 text-sm rounded border px-2 py-1 text-center"
            style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </label>
      )}
    </form>
  )
}
