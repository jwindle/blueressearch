"use client"

import { useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { CopyJsonButton } from "@/components/documents/CopyJsonButton"
import { ResumeCard } from "@/components/documents/ResumeCard"
import { InfoTooltip } from "@/components/InfoTooltip"
import { jsonEditorExtensions } from "@/components/match/shared"
import { LIMITS } from "@/lib/limits"
import { SECTION_LABELS } from "@/lib/text-to-resume"
import type { Section } from "@/lib/text-to-resume"
import type { Resume } from "@/types/documents"

const LABEL_COLORS: Record<string, string> = {
  basics: "#6366f1",
  work: "#ef4444",
  education: "#10b981",
  skills: "#f59e0b",
  projects: "#8b5cf6",
  awards: "#0ea5e9",
  certificates: "#0ea5e9",
  volunteer: "#ef4444",
  publications: "#8b5cf6",
  languages: "#f59e0b",
  interests: "#10b981",
  references: "#6b7280",
  unknown: "#6b7280",
}

function SectionCard({
  section,
  onChange,
  onDelete,
}: {
  section: Section
  onChange: (s: Section) => void
  onDelete: () => void
}) {
  const color = LABEL_COLORS[section.label] ?? "#6b7280"
  const lineCount = section.text.split("\n").length

  return (
    <div
      className="rounded border p-3 space-y-2"
      style={{ borderColor: "var(--border)", background: "var(--muted)", borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={section.label}
          onChange={e => onChange({ ...section, label: e.target.value })}
          className="text-xs rounded border px-2 py-1 font-medium"
          style={{ borderColor: "var(--border)", background: "var(--background)", color }}
        >
          {SECTION_LABELS.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onDelete}
          className="text-xs px-2 py-1 rounded border hover:opacity-70 transition-opacity"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          ✕
        </button>
      </div>
      <textarea
        value={section.text}
        onChange={e => onChange({ ...section, text: e.target.value })}
        rows={Math.min(Math.max(3, lineCount + 1), 20)}
        className="w-full text-xs rounded border px-2 py-1.5 resize-y font-mono"
        style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
      />
    </div>
  )
}

export function TextToResumeClient() {
  const [text, setText] = useState("")
  const [sections, setSections] = useState<Section[]>([])
  const [resume, setResume] = useState<Resume | null>(null)
  const [jsonText, setJsonText] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [structuring, setStructuring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExtract() {
    if (!text.trim()) return
    setExtracting(true)
    setError(null)
    setSections([])
    setResume(null)
    setJsonText("")
    try {
      const res = await fetch("/api/text-to-resume/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Could not extract sections.")
      setSections(json.sections)
    } catch (err) {
      setError(String(err))
    } finally {
      setExtracting(false)
    }
  }

  async function handleStructure() {
    setStructuring(true)
    setError(null)
    setResume(null)
    try {
      const res = await fetch("/api/text-to-resume/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Could not generate resume.")
      setResume(json.resume)
      setJsonText(JSON.stringify(json.resume, null, 2))
    } catch (err) {
      setError(String(err))
    } finally {
      setStructuring(false)
    }
  }

  function updateSection(index: number, updated: Section) {
    setSections(prev => prev.map((s, i) => i === index ? updated : s))
  }

  function deleteSection(index: number) {
    setSections(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Text to Resume</h1>
        <InfoTooltip text="Paste any unstructured resume text. Step 1 classifies it into labeled sections you can review and edit. Step 2 converts those sections into a structured JSON document." />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
          {error}
        </div>
      )}

      {/* Step 1: paste text */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            1. Paste text
          </h2>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || !text.trim()}
            className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {extracting ? "Extracting..." : "Extract Sections"}
          </button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={LIMITS.RAW_TEXT}
          rows={12}
          placeholder="Paste an unstructured resume..."
          className="w-full text-sm rounded border px-3 py-2 resize-y"
          style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
      </div>

      {/* Step 2: review sections */}
      {sections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              2. Review sections
              <span className="ml-2 font-normal normal-case">({sections.length})</span>
            </h2>
            <button
              type="button"
              onClick={handleStructure}
              disabled={structuring || sections.length === 0}
              className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {structuring ? "Generating..." : "Generate JSON →"}
            </button>
          </div>
          {sections.map((section, i) => (
            <SectionCard
              key={i}
              section={section}
              onChange={updated => updateSection(i, updated)}
              onDelete={() => deleteSection(i)}
            />
          ))}
        </div>
      )}

      {/* Step 3: JSON + preview */}
      {resume && (() => {
        let parsed: Resume | null = null
        let parseError: string | null = null
        try { parsed = JSON.parse(jsonText) } catch { parseError = "Invalid JSON" }
        return (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              3. Structured JSON
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {parseError
                    ? <span className="text-xs" style={{ color: "#ef4444" }}>{parseError}</span>
                    : <span />}
                  <CopyJsonButton data={parsed ?? resume} />
                </div>
                <CodeMirror
                  value={jsonText}
                  onChange={setJsonText}
                  minHeight="20rem"
                  theme="none"
                  extensions={jsonEditorExtensions}
                  basicSetup={{ foldGutter: true, lineNumbers: true, highlightActiveLine: false, highlightActiveLineGutter: false }}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Preview</p>
                <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
                  <ResumeCard data={(parsed ?? resume) as Resume} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
