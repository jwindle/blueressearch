"use client"

import { useState, type FormEvent } from "react"
import { CopyJsonButton } from "@/components/documents/CopyJsonButton"
import { JobPostCard } from "@/components/documents/JobPostCard"
import type { JobPost } from "@/types/documents"

interface GeneratedSection {
  label: string
  heading: string | null
  text: string
}

interface TextToJobPostResponse {
  sections: GeneratedSection[]
  jobPost: JobPost
}

export default function TextToJobPostPage() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<TextToJobPostResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/text-to-job-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? "Could not convert job post.")
      setResult(json)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Text to Job Post</h1>
        <button
          type="submit"
          form="text-to-job-post-form"
          disabled={loading || !text.trim()}
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Converting..." : "Convert"}
        </button>
      </div>

      <form id="text-to-job-post-form" onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          rows={14}
          placeholder="Paste an unstructured job post..."
          className="w-full text-sm rounded border px-3 py-2 resize-y"
          style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
      </form>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}>
          {error}
        </div>
      )}

      {result && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Structured JSON
              </h2>
              <CopyJsonButton data={result.jobPost} />
            </div>
            <pre
              className="overflow-auto rounded border p-3 text-xs"
              style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {JSON.stringify(result.jobPost, null, 2)}
            </pre>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Preview
            </h2>
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
              <JobPostCard data={result.jobPost} />
            </div>
          </div>

          {result.sections.length > 0 && (
            <div className="space-y-3 lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                Classified Sections
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {result.sections.map((section, index) => (
                  <div
                    key={`${section.label}-${index}`}
                    className="rounded border p-3 space-y-1"
                    style={{ borderColor: "var(--border)", background: "var(--muted)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                        {section.label}
                      </p>
                      {section.heading && (
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {section.heading}
                        </p>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{section.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
