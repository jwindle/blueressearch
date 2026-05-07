"use client"

import { useMemo, useState, type FormEvent } from "react"
import { createApiClient } from "@/lib/api"
import { LIMITS } from "@/lib/limits"
import {
  type MatchPair,
  matchEmbeddings,
  parseDocument,
  useExtractorSelection,
  JsonEditor,
  TextInputList,
  DistanceHistogram,
  EmbeddingCard,
  InfoTooltip,
} from "./shared"

export function MatchEditTextPage() {
  const [leftTexts, setLeftTexts] = useState([""])
  const [rightJson, setRightJson] = useState("")
  const [pairs, setPairs] = useState<MatchPair[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const right = useMemo(() => parseDocument(rightJson), [rightJson])
  const rightExtractors = useExtractorSelection(right.backend)

  async function handleCompare(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPairs([])

    const validTexts = leftTexts.filter(t => t.trim())
    if (validTexts.length === 0) {
      setError("Enter at least one text on the left.")
      return
    }
    if (!right.data || !right.backend || right.error) {
      setError("The right JSON must be valid and match a configured document type.")
      return
    }
    if (rightExtractors.selectedNames.length === 0) {
      setError("Select at least one extractor for the right document.")
      return
    }

    setLoading(true)
    try {
      const client = createApiClient(right.backend.url)
      const [leftEmbs, rightEmbs] = await Promise.all([
        client.embedTexts(validTexts),
        client.embedDocument(right.data),
      ])

      const rightSelected = new Set(rightExtractors.selectedNames)
      const filteredRight = rightEmbs.filter(item => rightSelected.has(item.extractor_name))

      if (filteredRight.length === 0) {
        setError("No embeddings extracted from the right document. Check that it matches the inferred schema.")
        return
      }

      setPairs(matchEmbeddings(leftEmbs, filteredRight))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const canCompare =
    leftTexts.some(t => t.trim()) &&
    !!right.data && !!right.backend && !right.error &&
    rightExtractors.selectedNames.length > 0

  return (
    <form onSubmit={handleCompare} className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Match: Text vs Doc</h1>
          <InfoTooltip text="Enter free-form text on the left and paste a JSON document on the right. Your text inputs are embedded directly using the document's inferred backend. The page finds the closest document chunk for each text input." />
        </div>
        <button
          type="submit"
          disabled={loading || !canCompare}
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Embedding…" : "Compare"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TextInputList
          title="Left (Text)"
          texts={leftTexts}
          onChange={texts => { setLeftTexts(texts); setPairs([]) }}
          maxLength={LIMITS.EMBEDDING_QUERY}
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
              <span>Text</span>
              <span>{right.backend?.name ?? "Right"}</span>
            </div>
            {pairs.map((pair, i) => (
              <div
                key={i}
                className="grid gap-6 rounded-lg border p-4 lg:grid-cols-2"
                style={{ borderColor: "var(--border)", background: "var(--muted)" }}
              >
                <p className="text-sm leading-relaxed">{pair.leftItem.text}</p>
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
