"use client"

import { useState, useEffect } from "react"
import type { ExtractorInfo, SearchableField, FilterCondition } from "@/types/api"
import { FilterBuilder } from "./FilterBuilder"
import { resolveHandleToDid } from "@/lib/did"

export interface MultiQueryParams {
  queryTexts: string[]
  extractorNames: string[]
  filters: FilterCondition[]
  docUrl: string
}

interface Props {
  extractors: ExtractorInfo[]
  fields: SearchableField[]
  onSearch: (params: MultiQueryParams) => void
  loading: boolean
}

export function MultiQueryForm({ extractors, fields, onSearch, loading }: Props) {
  const [queries, setQueries] = useState(["", ""])
  const [selectedExtractors, setSelectedExtractors] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [authorInput, setAuthorInput] = useState("")
  const [authorDid, setAuthorDid] = useState("")
  const [authorResolving, setAuthorResolving] = useState(false)
  const [authorFailed, setAuthorFailed] = useState(false)

  useEffect(() => {
    if (extractors.length > 0) setSelectedExtractors(extractors.map(e => e.name))
  }, [extractors])

  function setQuery(i: number, value: string) {
    setQueries(prev => prev.map((q, idx) => (idx === i ? value : q)))
  }

  function removeQuery(i: number) {
    setQueries(prev => prev.filter((_, idx) => idx !== i))
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

  function toggleExtractor(name: string) {
    setSelectedExtractors(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const validQueries = queries.filter(q => q.trim())
    if (validQueries.length === 0 || selectedExtractors.length === 0) return
    onSearch({ queryTexts: validQueries, extractorNames: selectedExtractors, filters, docUrl: authorDid })
  }

  const canSubmit = queries.some(q => q.trim()) && selectedExtractors.length > 0

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        {queries.map((q, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span
              className="text-xs w-20 shrink-0 text-right"
              style={{ color: "var(--muted-foreground)" }}
            >
              {`Query ${i + 1}`}
            </span>
            <input
              value={q}
              onChange={e => setQuery(i, e.target.value)}
              placeholder="Search text…"
              className="flex-1 text-sm rounded border px-3 py-2"
              style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeQuery(i)}
                className="text-xs px-2 py-1 rounded"
                style={{ color: "var(--muted-foreground)" }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setQueries(prev => [...prev, ""])}
          className="text-xs px-3 py-1.5 rounded border"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          + Add query
        </button>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={loading || !canSubmit}
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

    </form>
  )
}
