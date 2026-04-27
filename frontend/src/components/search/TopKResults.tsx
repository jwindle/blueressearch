"use client"

import { useEffect, useState, type ComponentType } from "react"
import Link from "next/link"
import type { TopKSearchResult } from "@/types/api"

interface Props {
  results: TopKSearchResult[]
  DocumentCard: ComponentType<{ data: unknown }>
  backendId: string
  pinnedId: string | null
}

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

function HandleBadge({ atUri }: { atUri: string }) {
  const [handle, setHandle] = useState<string | null>(null)

  useEffect(() => {
    const did = atUri.match(/^at:\/\/(did:[^/]+)/)?.[1] ?? null
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

export function TopKResults({ results, DocumentCard, backendId, pinnedId }: Props) {
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
          key={`${result.document_id}-${i}`}
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
            </div>
            <span className="text-xs tabular-nums" style={{ color: "var(--muted-foreground)" }}>
              mean dist {result.mean_distance.toFixed(4)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
