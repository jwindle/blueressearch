"use client"

import { useState } from "react"

export function CopyJsonButton({ data }: { data: unknown }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle")

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setStatus("copied")
      window.setTimeout(() => setStatus("idle"), 1500)
    } catch {
      setStatus("error")
      window.setTimeout(() => setStatus("idle"), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={copyJson}
      className="text-xs hover:opacity-70 transition-opacity shrink-0"
      style={{ color: status === "error" ? "#991b1b" : "var(--muted-foreground)" }}
      aria-label="Copy JSON to clipboard"
    >
      {status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy JSON"}
    </button>
  )
}
