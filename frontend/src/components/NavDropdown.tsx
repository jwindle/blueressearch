"use client"

import { useState } from "react"
import Link from "next/link"

function ExternalLinkIcon() {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className="inline-block ml-0.5 translate-y-[-1px]"
    >
      <path d="M4 2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6" />
      <path d="M6.5 1H9v2.5M9 1 5 5" />
    </svg>
  )
}

export interface NavItem {
  href: string
  label: string
  external?: boolean
}

export function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="text-sm hover:opacity-70 transition-opacity flex items-center gap-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true" className="mt-px">
          <path d="M0 2l4 4 4-4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-1 z-50">
          <div
            className="rounded-lg border py-1 shadow-lg"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            {items.map(item =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-1.5 text-sm hover:opacity-70 transition-opacity whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {item.label}<ExternalLinkIcon />
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-1.5 text-sm hover:opacity-70 transition-opacity whitespace-nowrap"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
