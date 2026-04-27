"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { backends } from "@/config/backends"
import { createApiClient } from "@/lib/api"
import type { DocumentEmbeddingItem } from "@/types/api"

interface MatchPair {
  jobItem: DocumentEmbeddingItem
  resumeItem: DocumentEmbeddingItem
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
  jobEmbs: DocumentEmbeddingItem[],
  resumeEmbs: DocumentEmbeddingItem[],
): MatchPair[] {
  if (jobEmbs.length === 0 || resumeEmbs.length === 0) return []
  return jobEmbs
    .map(jobItem => {
      let bestResume = resumeEmbs[0]
      let bestDist = Infinity
      for (const r of resumeEmbs) {
        const d = l2Distance(jobItem.embedding, r.embedding)
        if (d < bestDist) { bestDist = d; bestResume = r }
      }
      return { jobItem, resumeItem: bestResume, distance: bestDist }
    })
    .sort((a, b) => a.distance - b.distance)
}

function buildHistogram(pairs: MatchPair[], bins = 5) {
  if (pairs.length === 0) return []
  const distances = pairs.map(p => p.distance)
  const min = Math.min(...distances)
  const max = Math.max(...distances)
  const range = max - min || 1
  const width = range / bins
  const counts = Array.from({ length: bins }, (_, i) => ({
    label: (min + i * width).toFixed(2),
    count: 0,
  }))
  for (const d of distances) {
    const i = Math.min(Math.floor((d - min) / width), bins - 1)
    counts[i].count++
  }
  return counts
}

function DistanceHistogram({ pairs }: { pairs: MatchPair[] }) {
  const data = buildHistogram(pairs)
  return (
    <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        Distance distribution
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barCategoryGap="10%">
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--border)" }}
            contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
            formatter={(v) => [v, "pairs"]}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmbeddingCard({ item }: { item: DocumentEmbeddingItem }) {
  return (
    <div className="space-y-1">
      <p
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        {item.extractor_name}
        {item.subkey != null ? ` · ${item.subkey}` : ""}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
        {item.text}
      </p>
    </div>
  )
}

export function MatchPage({
  resumeId,
  jobId,
}: {
  resumeId: string | null
  jobId: string | null
}) {
  const jobsBackend = backends.find(b => b.id === "jobs")
  const resumesBackend = backends.find(b => b.id === "resumes")

  const [pairs, setPairs] = useState<MatchPair[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!resumeId || !jobId || !jobsBackend || !resumesBackend) return
    setLoading(true)
    setError(null)

    Promise.all([
      createApiClient(jobsBackend.url).getDocumentEmbeddings(jobId),
      createApiClient(resumesBackend.url).getDocumentEmbeddings(resumeId),
    ])
      .then(([jobEmbs, resumeEmbs]) => setPairs(matchEmbeddings(jobEmbs, resumeEmbs)))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [resumeId, jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!resumeId || !jobId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Provide both <code>?job=&lt;uuid&gt;&amp;resume=&lt;uuid&gt;</code> in the URL.
        </p>
      </div>
    )
  }

  if (!jobsBackend || !resumesBackend) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Both jobs and résumés backends must be configured.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Document Match</h1>

      {loading && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Loading embeddings…
        </p>
      )}

      {error && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}
        >
          {error}
        </div>
      )}

      {!loading && pairs.length === 0 && !error && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No embeddings found.
        </p>
      )}

      {pairs.length > 0 && <DistanceHistogram pairs={pairs} />}

      {pairs.length > 0 && (
        <div className="space-y-3">
          <div
            className="grid grid-cols-2 gap-6 text-xs font-semibold uppercase tracking-wider pb-1 border-b"
            style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
          >
            <span>Job</span>
            <span>Résumé</span>
          </div>

          {pairs.map((pair, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-6 rounded-lg border p-4"
              style={{ borderColor: "var(--border)", background: "var(--muted)" }}
            >
              <EmbeddingCard item={pair.jobItem} />
              <EmbeddingCard item={pair.resumeItem} />
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
