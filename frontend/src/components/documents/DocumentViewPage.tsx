import { type ComponentType } from "react"
import Link from "next/link"
import type { DocumentResponse } from "@/types/api"

async function resolveHandle(atUri: string): Promise<string | null> {
  const did = atUri.match(/^at:\/\/(did:[^/]+)/)?.[1]
  if (!did) return null
  try {
    const res = await fetch(`https://plc.directory/${did}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const json = await res.json()
    const aka: string | undefined = (json.alsoKnownAs ?? [])[0]
    return aka ? aka.replace("at://", "") : null
  } catch {
    return null
  }
}

interface Props {
  backendId: string
  backendName: string
  doc: DocumentResponse
  DocumentCard: ComponentType<{ data: unknown }>
}

export async function DocumentViewPage({ backendId, backendName, doc, DocumentCard }: Props) {
  const handle = doc.url ? await resolveHandle(doc.url) : null

  const findLabel = backendId === "jobs" ? "Pin and search résumés" : "Pin and search jobs"
  const findHref = backendId === "jobs"
    ? `/search/resumes/standard?job=${doc.id}`
    : `/search/jobs/standard?resume=${doc.id}`

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">{backendName}</h1>
        <Link
          href={`/search/${backendId}/standard`}
          className="text-sm hover:opacity-70 transition-opacity"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Search
        </Link>
      </div>

      <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
        {handle && (
          <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
            @{handle}
          </span>
        )}

        <DocumentCard data={doc.data} />

        <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href={findHref}
            className="text-xs hover:opacity-70 transition-opacity"
            style={{ color: "var(--muted-foreground)" }}
          >
            {findLabel}
          </Link>
        </div>

        {(doc.verified !== null || doc.deleted) && (
          <div className="flex items-center gap-3 pt-2 border-t text-xs" style={{ borderColor: "var(--border)" }}>
            {doc.verified !== null && (
              <span
                className="px-2 py-0.5 rounded-full"
                style={{
                  background: doc.verified ? "#dcfce7" : "#fee2e2",
                  color: doc.verified ? "#166534" : "#991b1b",
                }}
              >
                {doc.verified ? "Verified" : "Unverified"}
              </span>
            )}
            {doc.deleted && (
              <span className="px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#991b1b" }}>
                Deleted
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
