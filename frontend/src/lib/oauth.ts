import { NodeOAuthClient, requestLocalLock } from "@atproto/oauth-client-node"
import { prisma } from "./prisma"

const APP_URL = process.env.APP_URL || "http://localhost:3000"

// ── Postgres-backed stores ────────────────────────────────────────────────────

function pgStore(model: "oauthState" | "oauthSession") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (prisma as any)[model]
  return {
    async get(key: string): Promise<unknown | undefined> {
      const row = await table.findUnique({ where: { key } })
      return row?.data ?? undefined
    },
    async set(key: string, value: unknown): Promise<void> {
      await table.upsert({
        where: { key },
        create: { key, data: value as object },
        update: { data: value as object },
      })
    },
    async del(key: string): Promise<void> {
      await table.delete({ where: { key } }).catch(() => {})
    },
  }
}

// ── compatFetch ───────────────────────────────────────────────────────────────
//
// @atproto/oauth-client's dpopFetchWrapper builds a Request object with
// duplex:'half' and passes it as the sole argument to fetch(). In Vercel's
// Node.js runtime this throws "expected non-null body source" from undici's
// extractBody. Decomposing the Request back to (url, init) avoids the
// problematic code path. Safe because dpopFetchWrapper retries from the
// original (url, init) arguments, not from the consumed Request object.
//
async function compatFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (input instanceof Request) {
    const req = input
    const headers: Record<string, string> = {}
    req.headers.forEach((v, k) => { headers[k] = v })
    const body = req.body ? await req.arrayBuffer() : undefined
    return globalThis.fetch(req.url, { method: req.method, headers, body })
  }
  return globalThis.fetch(input as RequestInfo, init)
}

// ── OAuth client (lazy singleton) ─────────────────────────────────────────────
// Instantiated on first use so that build-time module evaluation doesn't
// trigger client-metadata validation before APP_URL is available.

let _client: NodeOAuthClient | null = null

export function getOauthClient(): NodeOAuthClient {
  if (!_client) {
    const appUrl = process.env.APP_URL || "http://localhost:3000"
    _client = new NodeOAuthClient({
      clientMetadata: {
        client_name: "BlueRes Search",
        client_id: `${appUrl}/oauth/client-metadata`,
        client_uri: appUrl,
        redirect_uris: [`${appUrl}/api/oauth/callback`],
        scope: "atproto transition:generic",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        application_type: "web",
        dpop_bound_access_tokens: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stateStore: pgStore("oauthState") as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionStore: pgStore("oauthSession") as any,
      fetch: compatFetch,
      requestLock: requestLocalLock,
    })
  }
  return _client
}
