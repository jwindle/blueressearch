"use client"

import { useState } from "react"

interface Props {
  onSave: () => Promise<{ rkey: string } | { error: string }>
  label?: string
}

export function SaveToPDS({ onSave, label = "Save to Bluesky" }: Props) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setStatus("saving")
    setError(null)
    const result = await onSave()
    if ("error" in result) {
      setError(result.error)
      setStatus("error")
    } else {
      setStatus("saved")
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={status === "saving" || status === "saved"}
        className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : label}
      </button>
      {status === "error" && error && (
        <p className="text-xs max-w-xs text-right" style={{ color: "#ef4444" }}>{error}</p>
      )}
    </div>
  )
}
