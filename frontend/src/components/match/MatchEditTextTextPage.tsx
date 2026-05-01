"use client"

import { useState, type FormEvent } from "react"
import { backends } from "@/config/backends"
import { createApiClient } from "@/lib/api"
import {
  type MatchPair,
  matchEmbeddings,
  TextInputList,
  DistanceHistogram,
  EmbeddingCard,
  InfoTooltip,
} from "./shared"

const backend = backends[0]

export function MatchEditTextTextPage() {
  const [leftTexts, setLeftTexts] = useState([""])
  const [rightTexts, setRightTexts] = useState([""])
  const [pairs, setPairs] = useState<MatchPair[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCompare(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPairs([])

    const validLeft = leftTexts.filter(t => t.trim())
    const validRight = rightTexts.filter(t => t.trim())

    if (validLeft.length === 0 || validRight.length === 0) {
      setError("Both sides need at least one non-empty text.")
      return
    }

    setLoading(true)
    try {
      const client = createApiClient(backend.url)
      const [leftEmbs, rightEmbs] = await Promise.all([
        client.embedTexts(validLeft),
        client.embedTexts(validRight),
      ])
      setPairs(matchEmbeddings(leftEmbs, rightEmbs))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const canCompare = leftTexts.some(t => t.trim()) && rightTexts.some(t => t.trim())

  return (
    <form onSubmit={handleCompare} className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Match: Text vs Text</h1>
          <InfoTooltip text="Enter free-form text on both sides. Both are embedded in the same space and the page finds the closest right-side text for each left-side input, showing their distances." />
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
          title="Left"
          texts={leftTexts}
          onChange={texts => { setLeftTexts(texts); setPairs([]) }}
        />
        <TextInputList
          title="Right"
          texts={rightTexts}
          onChange={texts => { setRightTexts(texts); setPairs([]) }}
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
              <span>Left</span>
              <span>Right</span>
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
