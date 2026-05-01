"use client"

import { useState } from "react"

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-xs leading-none cursor-default select-none flex-shrink-0"
        style={{ borderColor: "var(--muted-foreground)", color: "var(--muted-foreground)" }}
        aria-label="More information"
      >
        i
      </button>
      {open && (
        <div
          className="absolute left-0 top-7 z-20 w-72 rounded-lg border p-3 text-sm shadow-lg"
          style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
