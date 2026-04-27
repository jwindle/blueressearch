"use client"

import { use, useState } from "react"
import Link from "next/link"
import { backends } from "@/config/backends"
import { createApiClient } from "@/lib/api"

interface AtRecord {
  uri: string
  value: Record<string, unknown>
}

async function resolveHandleToDid(handle: string): Promise<string> {
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
  )
  if (!res.ok) throw new Error(`Could not resolve handle "${handle}"`)
  return (await res.json()).did
}

async function getPdsEndpoint(did: string): Promise<string> {
  if (!did.startsWith("did:plc:")) return "https://bsky.social"
  try {
    const res = await fetch(`https://plc.directory/${did}`)
    if (!res.ok) return "https://bsky.social"
    const doc = await res.json()
    const svc = (doc.service ?? []).find(
      (s: { type: string }) => s.type === "AtprotoPersonalDataServer"
    )
    return svc?.serviceEndpoint ?? "https://bsky.social"
  } catch {
    return "https://bsky.social"
  }
}

async function fetchAllRecords(pds: string, did: string, collection: string): Promise<AtRecord[]> {
  const all: AtRecord[] = []
  let cursor: string | undefined
  do {
    const params = new URLSearchParams({ repo: did, collection, limit: "100" })
    if (cursor) params.set("cursor", cursor)
    const res = await fetch(`${pds}/xrpc/com.atproto.repo.listRecords?${params}`)
    if (!res.ok) throw new Error(`Failed to list records (${res.status} ${res.statusText})`)
    const json = await res.json()
    all.push(...(json.records ?? []))
    cursor = json.cursor
  } while (cursor)
  return all
}

type Status = "idle" | "resolving" | "fetching" | "adding" | "done" | "error"

interface Props {
  params: Promise<{ backendId: string }>
}

export default function AddPage({ params }: Props) {
  const { backendId } = use(params)
  const backend = backends.find(b => b.id === backendId)

  const [input, setInput] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [statusMsg, setStatusMsg] = useState("")
  const [total, setTotal] = useState(0)
  const [added, setAdded] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [log, setLog] = useState<{ uri: string; ok: boolean; msg?: string }[]>([])

  if (!backend) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>
        Backend &ldquo;{backendId}&rdquo; not found.
      </div>
    )
  }

  if (!backend.atCollection) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>
        No ATProto collection configured for this backend.
      </div>
    )
  }

  const { atCollection, url: backendUrl } = backend

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const raw = input.trim()
    if (!raw) return

    setStatus("resolving")
    setStatusMsg("")
    setTotal(0)
    setAdded(0)
    setSkipped(0)
    setLog([])

    try {
      // Resolve handle → DID if needed
      let did = raw
      if (!raw.startsWith("did:")) {
        setStatusMsg(`Resolving @${raw}…`)
        did = await resolveHandleToDid(raw)
      }
      setStatusMsg(`Resolved to ${did}`)

      // Find PDS
      setStatus("fetching")
      setStatusMsg("Looking up PDS endpoint…")
      const pds = await getPdsEndpoint(did)

      // Fetch all records
      setStatusMsg("Fetching records…")
      const records = await fetchAllRecords(pds, did, atCollection)
      setTotal(records.length)
      setStatusMsg(`Found ${records.length} record${records.length !== 1 ? "s" : ""}`)

      if (records.length === 0) {
        setStatus("done")
        return
      }

      // Add each record
      setStatus("adding")
      const client = createApiClient(backendUrl)
      let addedCount = 0
      let skippedCount = 0
      const entries: { uri: string; ok: boolean; msg?: string }[] = []

      for (const record of records) {
        try {
          await client.upsertDocument({ url: record.uri, data: record.value })
          addedCount++
          entries.push({ uri: record.uri, ok: true })
        } catch (err) {
          skippedCount++
          entries.push({ uri: record.uri, ok: false, msg: String(err) })
        }
        setAdded(addedCount)
        setSkipped(skippedCount)
        setLog([...entries])
      }

      setStatus("done")
    } catch (err) {
      setStatus("error")
      setStatusMsg(String(err))
    }
  }

  const progress = total > 0 ? Math.round((added + skipped) / total * 100) : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/search/${backendId}`}
          className="text-sm hover:opacity-70 transition-opacity"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← {backend.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Add to {backend.name}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Enter a Bluesky handle or DID to fetch and index their{" "}
          <code className="font-mono text-xs">{backend.atCollection}</code> records.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="handle.bsky.social or did:plc:…"
          disabled={status === "resolving" || status === "fetching" || status === "adding"}
          className="flex-1 text-sm rounded border px-3 py-2"
          style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || status === "resolving" || status === "fetching" || status === "adding"}
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {status === "resolving" || status === "fetching" || status === "adding" ? "Running…" : "Fetch & Add"}
        </button>
      </form>

      {statusMsg && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{statusMsg}</p>
      )}

      {(status === "adding" || status === "done") && total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm" style={{ color: "var(--muted-foreground)" }}>
            <span>
              {added} added{skipped > 0 ? `, ${skipped} failed` : ""}
            </span>
            <span>{added + skipped} / {total}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%`, background: "var(--accent)" }}
            />
          </div>
          {status === "done" && (
            <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              Done — {added} record{added !== 1 ? "s" : ""} indexed.
            </p>
          )}
        </div>
      )}

      {status === "error" && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{ background: "#fee2e2", color: "#991b1b", borderLeft: "3px solid #ef4444" }}
        >
          {statusMsg}
        </div>
      )}

      {log.length > 0 && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i} className="text-xs flex gap-2" style={{ color: entry.ok ? "var(--muted-foreground)" : "#991b1b" }}>
              <span>{entry.ok ? "✓" : "✗"}</span>
              <span className="font-mono truncate">{entry.uri}</span>
              {entry.msg && <span className="shrink-0">— {entry.msg}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
