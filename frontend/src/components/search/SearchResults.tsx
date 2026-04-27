"use client"

import { useEffect, useState, type ComponentType } from "react"
import Link from "next/link"
import type { ExtractorInfo, SearchResult } from "@/types/api"

interface Props {
  results: SearchResult[]
  extractors: ExtractorInfo[]
  DocumentCard: ComponentType<{ data: unknown }>
  backendId: string
  pinnedId: string | null
}

function resolvePath(data: unknown, path: string): unknown {
  const parts = path.split(/[\.\[\]]+/).filter(Boolean)
  let current: unknown = data
  for (const part of parts) {
    if (current == null) return undefined
    const index = Number(part)
    if (!isNaN(index) && String(index) === part) {
      current = (current as unknown[])[index]
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }
  return current
}

function formatResolved(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(v => String(v)).join(", ")
  return JSON.stringify(value)
}

function MatchLabel({ result, extractors }: { result: SearchResult; extractors: ExtractorInfo[] }) {
  const extractor = extractors.find(e => e.name === result.extractor_name)
  const keys = extractor?.keys ?? []

  if (keys.length === 1 && result.subkey) {
    const fullPath = keys[0] + result.subkey
    const resolved = resolvePath(result.data, fullPath)
    const display = formatResolved(resolved)
    return (
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Best match using key: <code className="font-mono">{keys[0]}</code>
        {display && <> = <em>{display}</em></>}
      </span>
    )
  }

  const label = keys.length > 0 ? keys.join(", ") : result.extractor_name
  return (
    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
      Best match using keys: <code className="font-mono">{label}</code>
    </span>
  )
}

// Module-level cache — persists across renders, avoids duplicate fetches
const didHandleCache = new Map<string, string | null>()

async function resolveDidHandle(did: string): Promise<string | null> {
  if (didHandleCache.has(did)) return didHandleCache.get(did)!
  try {
    const res = await fetch(`https://plc.directory/${did}`)
    if (!res.ok) { didHandleCache.set(did, null); return null }
    const json = await res.json()
    const aka: string | undefined = (json.alsoKnownAs ?? [])[0]
    const handle = aka ? aka.replace("at://", "") : null
    didHandleCache.set(did, handle)
    return handle
  } catch {
    didHandleCache.set(did, null)
    return null
  }
}

function extractDid(atUri: string): string | null {
  return atUri.match(/^at:\/\/(did:[^/]+)/)?.[1] ?? null
}

function HandleBadge({ atUri }: { atUri: string }) {
  const [handle, setHandle] = useState<string | null>(null)

  useEffect(() => {
    const did = extractDid(atUri)
    if (!did) return
    resolveDidHandle(did).then(setHandle)
  }, [atUri])

  if (!handle) return null
  return (
    <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
      @{handle}
    </span>
  )
}

function cardLinks(backendId: string, docId: string, pinnedId: string | null) {
  if (backendId === "jobs") {
    return {
      viewLink: { href: `/document/jobs/${docId}`, label: "View" },
      findLink: { href: `/search/resumes/standard?job=${docId}`, label: "Pin and search résumés" },
      compareLink: pinnedId ? { href: `/match?job=${docId}&resume=${pinnedId}`, label: "Compare to pinned résumé" } : null,
    }
  }
  return {
    viewLink: { href: `/document/resumes/${docId}`, label: "View" },
    findLink: { href: `/search/jobs/standard?resume=${docId}`, label: "Pin and search jobs" },
    compareLink: pinnedId ? { href: `/match?resume=${docId}&job=${pinnedId}`, label: "Compare to pinned job" } : null,
  }
}

export function SearchResults({ results, extractors, DocumentCard, backendId, pinnedId }: Props) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
        No results found.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {results.map((result, i) => (
        <div
          key={`${result.document_id}-${result.subkey}-${i}`}
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: "var(--border)", background: "var(--muted)" }}
        >
          {result.url && <HandleBadge atUri={result.url} />}

          <DocumentCard data={result.data} />

          {(() => {
            const { viewLink, findLink, compareLink } = cardLinks(backendId, result.document_id, pinnedId)
            return (
              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                {compareLink && (
                  <Link href={compareLink.href} className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--accent)" }}>
                    {compareLink.label}
                  </Link>
                )}
                <Link href={viewLink.href} className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
                  {viewLink.label}
                </Link>
                <Link href={findLink.href} className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
                  {findLink.label}
                </Link>
              </div>
            )
          })()}

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              {result.verified !== null && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: result.verified ? "#dcfce7" : "#fee2e2",
                    color: result.verified ? "#166534" : "#991b1b",
                  }}
                >
                  {result.verified ? "Verified" : "Unverified"}
                </span>
              )}
              <MatchLabel result={result} extractors={extractors} />
            </div>
            <span className="text-xs tabular-nums" style={{ color: "var(--muted-foreground)" }}>
              dist {result.distance.toFixed(4)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
