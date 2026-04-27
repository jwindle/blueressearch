export async function resolveHandleToDid(handle: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
    )
    if (!res.ok) return null
    return (await res.json()).did ?? null
  } catch {
    return null
  }
}
