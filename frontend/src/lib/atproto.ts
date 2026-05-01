import { Agent } from "@atproto/api"
import { getSession } from "./auth"
import { getOauthClient } from "./oauth"

export async function getAgent(): Promise<Agent | null> {
  const session = await getSession()
  if (!session.did) return null
  try {
    const oauthSession = await getOauthClient().restore(session.did)
    return new Agent(oauthSession)
  } catch {
    return null
  }
}

export async function resolveDidToHandle(did: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(did)}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data.handle as string) ?? null
  } catch {
    return null
  }
}
