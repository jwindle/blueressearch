"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { backends } from "@/config/backends"
import { createApiClient } from "@/lib/api"
import type { DocumentEmbeddingItem } from "@/types/api"
import { InfoTooltip } from "./shared"

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

function ExtractorFilter({
  label,
  allNames,
  selected,
  onChange,
}: {
  label: string
  allNames: string[]
  selected: Set<string>
  onChange: (names: Set<string>) => void
}) {
  if (allNames.length === 0) return null

  function toggle(name: string) {
    const next = new Set(selected)
    next.has(name) ? next.delete(name) : next.add(name)
    onChange(next)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange(new Set(allNames))} className="text-xs hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>All</button>
          <button type="button" onClick={() => onChange(new Set())} className="text-xs hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>None</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {allNames.map(name => (
          <label
            key={name}
            className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs cursor-pointer"
            style={{
              borderColor: selected.has(name) ? "var(--accent)" : "var(--border)",
              color: selected.has(name) ? "var(--accent)" : "var(--muted-foreground)",
            }}
          >
            <input type="checkbox" checked={selected.has(name)} onChange={() => toggle(name)} />
            <span>{name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function DistanceHistogram({ pairs }: { pairs: MatchPair[] }) {
  const data = buildHistogram(pairs)
  const avg = pairs.length > 0
    ? pairs.reduce((sum, p) => sum + p.distance, 0) / pairs.length
    : null

  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
      {avg !== null && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Average distance
          </p>
          <p className="text-3xl font-semibold tabular-nums mt-1" style={{ color: "var(--foreground)" }}>
            {avg.toFixed(4)}
          </p>
        </div>
      )}
      <div className="space-y-1">
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
    </div>
  )
}

function EmbeddingCard({ item }: { item: DocumentEmbeddingItem }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        {item.extractor_name}{item.subkey != null ? ` · ${item.subkey}` : ""}
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

  const [allJobEmbs, setAllJobEmbs] = useState<DocumentEmbeddingItem[]>([])
  const [allResumeEmbs, setAllResumeEmbs] = useState<DocumentEmbeddingItem[]>([])
  const [selectedJobExtractors, setSelectedJobExtractors] = useState<Set<string>>(new Set())
  const [selectedResumeExtractors, setSelectedResumeExtractors] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const jobExtractorNames = useMemo(
    () => [...new Set(allJobEmbs.map(e => e.extractor_name))],
    [allJobEmbs],
  )
  const resumeExtractorNames = useMemo(
    () => [...new Set(allResumeEmbs.map(e => e.extractor_name))],
    [allResumeEmbs],
  )

  const pairs = useMemo(() => {
    const filteredJob = selectedJobExtractors.size > 0
      ? allJobEmbs.filter(e => selectedJobExtractors.has(e.extractor_name))
      : allJobEmbs
    const filteredResume = selectedResumeExtractors.size > 0
      ? allResumeEmbs.filter(e => selectedResumeExtractors.has(e.extractor_name))
      : allResumeEmbs
    return matchEmbeddings(filteredJob, filteredResume)
  }, [allJobEmbs, allResumeEmbs, selectedJobExtractors, selectedResumeExtractors])

  useEffect(() => {
    if (!resumeId || !jobId || !jobsBackend || !resumesBackend) return
    setLoading(true)
    setError(null)
    setAllJobEmbs([])
    setAllResumeEmbs([])
    setSelectedJobExtractors(new Set())
    setSelectedResumeExtractors(new Set())

    Promise.all([
      createApiClient(jobsBackend.url).getDocumentEmbeddings(jobId),
      createApiClient(resumesBackend.url).getDocumentEmbeddings(resumeId),
    ])
      .then(([jobEmbs, resumeEmbs]) => {
        setAllJobEmbs(jobEmbs)
        setAllResumeEmbs(resumeEmbs)
        setSelectedJobExtractors(new Set(jobEmbs.map(e => e.extractor_name)))
        setSelectedResumeExtractors(new Set(resumeEmbs.map(e => e.extractor_name)))
      })
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
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Document Match</h1>
        <InfoTooltip text="Compares a stored job post and résumé by their pre-computed embeddings. Select which extractors to include on each side — distances update instantly without re-embedding." />
      </div>

      {loading && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Loading embeddings…</p>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
          {error}
        </div>
      )}

      {!loading && allJobEmbs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ExtractorFilter
            label="Job extractors"
            allNames={jobExtractorNames}
            selected={selectedJobExtractors}
            onChange={setSelectedJobExtractors}
          />
          <ExtractorFilter
            label="Résumé extractors"
            allNames={resumeExtractorNames}
            selected={selectedResumeExtractors}
            onChange={setSelectedResumeExtractors}
          />
        </div>
      )}

      {!loading && pairs.length === 0 && !error && allJobEmbs.length > 0 && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No pairs — select at least one extractor on each side.</p>
      )}

      {!loading && pairs.length === 0 && !error && allJobEmbs.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No embeddings found.</p>
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
