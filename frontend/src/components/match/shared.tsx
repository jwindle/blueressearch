"use client"

import { useEffect, useState } from "react"
import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { json, jsonParseLinter } from "@codemirror/lang-json"
import { linter, lintGutter } from "@codemirror/lint"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { backends, type BackendConfig } from "@/config/backends"
import { createApiClient } from "@/lib/api"
import type { DocumentEmbeddingItem, ExtractorInfo } from "@/types/api"

export { InfoTooltip } from "@/components/InfoTooltip"

// ── Types ────────────────────────────────────────────────────────────────────

export interface MatchPair {
  leftItem: DocumentEmbeddingItem
  rightItem: DocumentEmbeddingItem
  distance: number
}

export interface ParsedDocument {
  data: Record<string, unknown> | null
  backend: BackendConfig | null
  error: string | null
}

export interface ExtractorSelection {
  options: ExtractorInfo[]
  selectedNames: string[]
  setSelectedNames: (names: string[]) => void
  error: string | null
}

// ── Math ─────────────────────────────────────────────────────────────────────

export function l2Distance(a: number[], b: number[]): number {
  let sum = 0
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export function matchEmbeddings(
  leftEmbs: DocumentEmbeddingItem[],
  rightEmbs: DocumentEmbeddingItem[],
): MatchPair[] {
  if (leftEmbs.length === 0 || rightEmbs.length === 0) return []
  return leftEmbs
    .map(leftItem => {
      let best = rightEmbs[0]
      let bestDist = Infinity
      for (const item of rightEmbs) {
        const d = l2Distance(leftItem.embedding, item.embedding)
        if (d < bestDist) { bestDist = d; best = item }
      }
      return { leftItem, rightItem: best, distance: bestDist }
    })
    .sort((a, b) => a.distance - b.distance)
}

export function buildHistogram(pairs: MatchPair[], bins = 5) {
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
  for (const distance of distances) {
    const index = Math.min(Math.floor((distance - min) / width), bins - 1)
    counts[index].count++
  }
  return counts
}

// ── Document parsing ──────────────────────────────────────────────────────────

export function parseDocument(input: string): ParsedDocument {
  if (!input.trim()) return { data: null, backend: null, error: null }

  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    return { data: null, backend: null, error: "Invalid JSON" }
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { data: null, backend: null, error: "JSON must be an object" }
  }

  const record = data as Record<string, unknown>
  const type = typeof record.$type === "string" ? record.$type.toLowerCase() : ""
  const backendId =
    type.includes("jobpost") || "jobTitle" in record || "jobTraits" in record || "employeeTraits" in record
      ? "jobs"
      : type.includes("resume") || "basics" in record || "work" in record || "education" in record || "skills" in record
        ? "resumes"
        : null

  if (!backendId) {
    return { data: record, backend: null, error: "Could not infer document type" }
  }

  const backend = backends.find(b => b.id === backendId) ?? null
  if (!backend) {
    return { data: record, backend: null, error: `The ${backendId} backend is not configured` }
  }

  return { data: record, backend, error: null }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useExtractorSelection(backend: BackendConfig | null): ExtractorSelection {
  const [options, setOptions] = useState<ExtractorInfo[]>([])
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const backendId = backend?.id ?? null
  const backendUrl = backend?.url ?? null

  useEffect(() => {
    let cancelled = false

    if (!backendId || !backendUrl) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setOptions([])
        setSelectedNames([])
        setError(null)
      })
      return () => { cancelled = true }
    }

    createApiClient(backendUrl).getExtractors()
      .then(extractors => {
        if (cancelled) return
        setOptions(extractors)
        setSelectedNames(extractors.map(e => e.name))
        setError(null)
      })
      .catch(e => {
        if (cancelled) return
        setOptions([])
        setSelectedNames([])
        setError(String(e))
      })

    return () => { cancelled = true }
  }, [backendId, backendUrl])

  return { options, selectedNames, setSelectedNames, error }
}

// ── Components ────────────────────────────────────────────────────────────────

export const jsonEditorExtensions = [
  json(),
  lintGutter(),
  linter(jsonParseLinter()),
  EditorView.lineWrapping,
  EditorView.theme({
    "&": {
      backgroundColor: "var(--muted)",
      color: "var(--foreground)",
      fontSize: "12px",
      border: "1px solid var(--border)",
      borderRadius: "0.25rem",
      overflow: "hidden",
    },
    ".cm-content": {
      minHeight: "18rem",
      padding: "0.5rem 0",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    ".cm-gutters": {
      backgroundColor: "var(--muted)",
      color: "var(--muted-foreground)",
      borderRightColor: "var(--border)",
    },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-tooltip": {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      borderColor: "var(--border)",
    },
  }),
]

export function ExtractorPicker({
  options,
  selectedNames,
  error,
  onChange,
}: {
  options: ExtractorInfo[]
  selectedNames: string[]
  error: string | null
  onChange: (names: string[]) => void
}) {
  if (error) {
    return (
      <div className="px-3 py-2 rounded text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
        Could not load extractors: {error}
      </div>
    )
  }

  if (options.length === 0) return null

  const selected = new Set(selectedNames)

  function toggle(name: string) {
    onChange(selected.has(name)
      ? selectedNames.filter(n => n !== name)
      : [...selectedNames, name])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          Match Extractors
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--muted-foreground)" }} onClick={() => onChange(options.map(o => o.name))}>All</button>
          <button type="button" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--muted-foreground)" }} onClick={() => onChange([])}>None</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <label
            key={option.name}
            className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs cursor-pointer"
            style={{
              borderColor: selected.has(option.name) ? "var(--accent)" : "var(--border)",
              color: selected.has(option.name) ? "var(--accent)" : "var(--muted-foreground)",
            }}
          >
            <input type="checkbox" checked={selected.has(option.name)} onChange={() => toggle(option.name)} />
            <span>{option.name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function JsonEditor({
  title,
  value,
  parsed,
  extractorSelection,
  onChange,
  onExtractorChange,
  actions,
}: {
  title: string
  value: string
  parsed: ParsedDocument
  extractorSelection: ExtractorSelection
  onChange: (value: string) => void
  onExtractorChange: (names: string[]) => void
  actions?: React.ReactNode
}) {
  const DocumentCard = parsed.backend?.DocumentCard

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {actions}
          {parsed.backend && (
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              {parsed.backend.name}
            </span>
          )}
        </div>
      </div>

      <CodeMirror
        value={value}
        onChange={onChange}
        height="18rem"
        minHeight="18rem"
        placeholder="{ ... }"
        theme="none"
        extensions={jsonEditorExtensions}
        basicSetup={{ foldGutter: true, lineNumbers: true, highlightActiveLine: false, highlightActiveLineGutter: false }}
      />

      {parsed.error && (
        <div className="px-3 py-2 rounded text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
          {parsed.error}
        </div>
      )}

      {parsed.backend && (
        <ExtractorPicker
          options={extractorSelection.options}
          selectedNames={extractorSelection.selectedNames}
          error={extractorSelection.error}
          onChange={onExtractorChange}
        />
      )}

      {DocumentCard && parsed.data && (
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
          <DocumentCard data={parsed.data} />
        </div>
      )}
    </div>
  )
}

export function TextInputList({
  title,
  texts,
  onChange,
  maxLength,
}: {
  title: string
  texts: string[]
  onChange: (texts: string[]) => void
  maxLength?: number
}) {
  function set(i: number, value: string) {
    onChange(texts.map((t, idx) => (idx === i ? value : t)))
  }
  function add() { onChange([...texts, ""]) }
  function remove(i: number) { onChange(texts.filter((_, idx) => idx !== i)) }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        {title}
      </h2>
      <div className="space-y-2">
        {texts.map((t, i) => (
          <div key={i} className="flex gap-2 items-start">
            <textarea
              value={t}
              onChange={e => set(i, e.target.value)}
              maxLength={maxLength}
              placeholder={`Text ${i + 1}…`}
              rows={4}
              className="flex-1 text-sm rounded border px-3 py-2 resize-y font-mono"
              style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            {texts.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-sm px-2 py-1 rounded hover:opacity-70 mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="text-sm px-3 py-1.5 rounded border hover:opacity-80"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
      >
        + Add text
      </button>
    </div>
  )
}

export function DistanceHistogram({ pairs }: { pairs: MatchPair[] }) {
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
            formatter={value => [value, "pairs"]}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}

export function EmbeddingCard({ item }: { item: DocumentEmbeddingItem }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        {item.extractor_name}{item.subkey != null ? ` - ${item.subkey}` : ""}
      </p>
      <p className="text-sm leading-relaxed">{item.text}</p>
    </div>
  )
}
