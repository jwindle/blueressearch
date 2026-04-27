"use client"

import { useState, useMemo } from "react"
import { backends } from "@/config/backends"
import { createApiClient } from "@/lib/api"
import type { DocumentEmbeddingItem } from "@/types/api"

interface MatchPair {
  leftItem: DocumentEmbeddingItem
  rightItem: DocumentEmbeddingItem
  distance: number
}

function l2Distance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

function matchEmbeddings(
  leftEmbs: DocumentEmbeddingItem[],
  rightEmbs: DocumentEmbeddingItem[],
): MatchPair[] {
  if (leftEmbs.length === 0 || rightEmbs.length === 0) return []
  return leftEmbs
    .map(leftItem => {
      let best = rightEmbs[0]
      let bestDist = Infinity
      for (const r of rightEmbs) {
        const d = l2Distance(leftItem.embedding, r.embedding)
        if (d < bestDist) { bestDist = d; best = r }
      }
      return { leftItem, rightItem: best, distance: bestDist }
    })
    .sort((a, b) => a.distance - b.distance)
}

interface Props {
  currentBackendId: string
  currentEmbeddings: DocumentEmbeddingItem[]
}

export function EmbeddingComparison({ currentBackendId, currentEmbeddings }: Props) {
  const otherBackends = backends.filter(b => b.id !== currentBackendId)
  const [selectedBackendId, setSelectedBackendId] = useState(otherBackends[0]?.id ?? "")
  const [jsonInput, setJsonInput] = useState("")
  const [direction, setDirection] = useState<"current-to-pasted" | "pasted-to-current">("current-to-pasted")
  const [pastedEmbs, setPastedEmbs] = useState<DocumentEmbeddingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentBackend = backends.find(b => b.id === currentBackendId)
  const selectedBackend = backends.find(b => b.id === selectedBackendId)

  const pairs = useMemo(() => {
    if (pastedEmbs.length === 0) return []
    return direction === "current-to-pasted"
      ? matchEmbeddings(currentEmbeddings, pastedEmbs)
      : matchEmbeddings(pastedEmbs, currentEmbeddings)
  }, [direction, currentEmbeddings, pastedEmbs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPastedEmbs([])

    let data: Record<string, unknown>
    try {
      data = JSON.parse(jsonInput)
    } catch {
      setError("Invalid JSON")
      return
    }

    if (!selectedBackend) return
    setLoading(true)
    try {
      const embs = await createApiClient(selectedBackend.url).embedDocument(data)
      if (embs.length === 0) {
        setError("No embeddings extracted — check that the JSON matches the expected schema for this backend.")
        return
      }
      setPastedEmbs(embs)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  if (otherBackends.length === 0) return null

  const currentLabel = currentBackend?.name ?? currentBackendId
  const selectedLabel = selectedBackend?.name ?? selectedBackendId

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Compare</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {otherBackends.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Document type
            </p>
            <select
              value={selectedBackendId}
              onChange={e => {
                setSelectedBackendId(e.target.value)
                setPastedEmbs([])
              }}
              className="text-sm rounded border px-2 py-1.5"
              style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {otherBackends.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Paste {selectedLabel} JSON
          </p>
          <textarea
            value={jsonInput}
            onChange={e => {
              setJsonInput(e.target.value)
              setPastedEmbs([])
            }}
            rows={6}
            placeholder={`{ ... }`}
            className="w-full text-xs font-mono rounded border px-3 py-2 resize-y"
            style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Anchor
          </p>
          <div className="flex gap-3">
            {(["current-to-pasted", "pasted-to-current"] as const).map(d => {
              const label = d === "current-to-pasted"
                ? `${currentLabel} → ${selectedLabel}`
                : `${selectedLabel} → ${currentLabel}`
              return (
                <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={d}
                    checked={direction === d}
                    onChange={() => setDirection(d)}
                  />
                  <span style={{ color: "var(--foreground)" }}>{label}</span>
                </label>
              )
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !jsonInput.trim()}
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Embedding…" : "Compare"}
        </button>
      </form>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
          {error}
        </div>
      )}

      {pairs.length > 0 && (
        <div className="space-y-3">
          <div
            className="grid grid-cols-2 gap-6 text-xs font-semibold uppercase tracking-wider pb-1 border-b"
            style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
          >
            <span>{direction === "current-to-pasted" ? currentLabel : selectedLabel}</span>
            <span>{direction === "current-to-pasted" ? selectedLabel : currentLabel}</span>
          </div>

          {pairs.map((pair, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-6 rounded-lg border p-4"
              style={{ borderColor: "var(--border)", background: "var(--muted)" }}
            >
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                  {pair.leftItem.extractor_name}{pair.leftItem.subkey != null ? ` · ${pair.leftItem.subkey}` : ""}
                </p>
                <p className="text-sm leading-relaxed">{pair.leftItem.text}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                  {pair.rightItem.extractor_name}{pair.rightItem.subkey != null ? ` · ${pair.rightItem.subkey}` : ""}
                </p>
                <p className="text-sm leading-relaxed">{pair.rightItem.text}</p>
              </div>
              <div
                className="col-span-2 text-xs tabular-nums text-right pt-2 border-t"
                style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
              >
                dist {pair.distance.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
