import { NextResponse } from "next/server"
import { getServerBackend } from "@/config/server-backends"
import { trackUsage, type UsageEvent } from "@/lib/usage"

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

function authKeyFor(path: string): string | undefined {
  return path === "/admin" || path.startsWith("/admin/")
    ? process.env.DOCSEARCH_ADMIN_KEY
    : process.env.DOCSEARCH_API_KEY
}

function usageEventFor(method: string, path: string): UsageEvent | null {
  if (method === "POST" && path === "/search") return "simple_search"
  if (method === "POST" && path === "/search/top-k") return "top_k_search"
  if (method === "POST" && path === "/documents/embed") return "embed_document"
  if (method === "POST" && path === "/documents") return "add_document"
  return null
}

async function forward(
  request: Request,
  context: { params: Promise<{ backendId: string; path: string[] }> },
) {
  const { backendId, path } = await context.params
  const backend = getServerBackend(backendId)
  if (!backend) {
    return NextResponse.json({ error: `Backend "${backendId}" is not configured.` }, { status: 404 })
  }

  const sourceUrl = new URL(request.url)
  const forwardedPath = `/${path.map(segment => encodeURIComponent(segment)).join("/")}`
  const targetUrl = new URL(`${backend.url.replace(/\/$/, "")}${forwardedPath}`)
  targetUrl.search = sourceUrl.search

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (!HOP_BY_HOP_HEADERS.has(lower) && lower !== "authorization") {
      headers.set(key, value)
    }
  })

  const apiKey = authKeyFor(forwardedPath)
  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`)
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  })

  const usageEvent = usageEventFor(request.method, forwardedPath)
  if (usageEvent && response.ok) {
    await trackUsage(usageEvent)
  }

  const responseHeaders = new Headers()
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = forward
export const POST = forward
export const PUT = forward
export const PATCH = forward
export const DELETE = forward
export const HEAD = forward
