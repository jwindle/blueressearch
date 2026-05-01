"use client"

import { useMemo, useState, type FormEvent } from "react"
import { createApiClient } from "@/lib/api"
import {
  type MatchPair,
  matchEmbeddings,
  parseDocument,
  useExtractorSelection,
  JsonEditor,
  DistanceHistogram,
  EmbeddingCard,
  InfoTooltip,
} from "./shared"

export function MatchEditDocsPage() {
  const [leftJson, setLeftJson] = useState("")
  const [rightJson, setRightJson] = useState("")
  const [pairs, setPairs] = useState<MatchPair[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const left = useMemo(() => parseDocument(leftJson), [leftJson])
  const right = useMemo(() => parseDocument(rightJson), [rightJson])
  const leftExtractors = useExtractorSelection(left.backend)
  const rightExtractors = useExtractorSelection(right.backend)

  async function handleCompare(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPairs([])

    if (!left.data || !left.backend || left.error) {
      setError("The left JSON must be valid and match a configured document type.")
      return
    }
    if (!right.data || !right.backend || right.error) {
      setError("The right JSON must be valid and match a configured document type.")
      return
    }

    setLoading(true)
    try {
      const [leftEmbs, rightEmbs] = await Promise.all([
        createApiClient(left.backend.url).embedDocument(left.data),
        createApiClient(right.backend.url).embedDocument(right.data),
      ])

      const leftSelected = new Set(leftExtractors.selectedNames)
      const rightSelected = new Set(rightExtractors.selectedNames)
      const filteredLeft = leftEmbs.filter(item => leftSelected.has(item.extractor_name))
      const filteredRight = rightEmbs.filter(item => rightSelected.has(item.extractor_name))

      if (filteredLeft.length === 0 || filteredRight.length === 0) {
        setError("No embeddings extracted. Check that both JSON documents match their inferred schemas.")
        return
      }

      setPairs(matchEmbeddings(filteredLeft, filteredRight))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const canCompare = !!left.data && !!left.backend && !left.error && leftExtractors.selectedNames.length > 0
    && !!right.data && !!right.backend && !right.error && rightExtractors.selectedNames.length > 0
  const leftLabel = left.backend?.name ?? "Left"
  const rightLabel = right.backend?.name ?? "Right"

  return (
    <form onSubmit={handleCompare} className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Match: Doc vs Doc</h1>
          <InfoTooltip text="Paste two JSON documents. Each document's type is inferred automatically, its extractors produce text chunks, and those chunks are embedded. The page finds the closest matching pair across both sides and shows their distances." />
        </div>
        <button
          type="submit"
          disabled={loading || !canCompare}
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Embedding..." : "Compare"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <JsonEditor
          title="Left JSON"
          value={leftJson}
          parsed={left}
          extractorSelection={leftExtractors}
          onChange={value => { setLeftJson(value); setPairs([]) }}
          onExtractorChange={names => { leftExtractors.setSelectedNames(names); setPairs([]) }}
        />
        <JsonEditor
          title="Right JSON"
          value={rightJson}
          parsed={right}
          extractorSelection={rightExtractors}
          onChange={value => { setRightJson(value); setPairs([]) }}
          onExtractorChange={names => { rightExtractors.setSelectedNames(names); setPairs([]) }}
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
          {error}
        </div>
      )}

      {pairs.length > 0 && (
        <div className="space-y-4">
          <DistanceHistogram pairs={pairs} />
          <div className="space-y-3">
            <div
              className="grid gap-6 text-xs font-semibold uppercase tracking-wider pb-1 border-b lg:grid-cols-2"
              style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
            >
              <span>{leftLabel}</span>
              <span>{rightLabel}</span>
            </div>
            {pairs.map((pair, i) => (
              <div
                key={i}
                className="grid gap-6 rounded-lg border p-4 lg:grid-cols-2"
                style={{ borderColor: "var(--border)", background: "var(--muted)" }}
              >
                <EmbeddingCard item={pair.leftItem} />
                <EmbeddingCard item={pair.rightItem} />
                <div
                  className="text-xs tabular-nums text-right pt-2 border-t lg:col-span-2"
                  style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
                >
                  dist {pair.distance.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}
