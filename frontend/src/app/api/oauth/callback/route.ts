import { NextRequest, NextResponse } from "next/server"
import { getOauthClient } from "@/lib/oauth"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const APP_URL = process.env.APP_URL || "http://localhost:3000"

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const { session } = await getOauthClient().callback(params)

    const ironSession = await getSession()
    ironSession.did = session.did

    // Resolve handle (best-effort)
    try {
      const res = await fetch(
        `https://bsky.social/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(session.did)}`,
      )
      if (res.ok) {
        const data = await res.json()
        ironSession.handle = data.handle as string
      }
    } catch { /* non-critical */ }

    await ironSession.save()

    // Upsert the Actor row so the rest of the app can reference this user
    await prisma.actor.upsert({
      where: { did: session.did },
      create: { did: session.did, handle: ironSession.handle, kind: "user", role: "user" },
      update: { handle: ironSession.handle, lastSeenAt: new Date() },
    })

    return NextResponse.redirect(new URL("/", APP_URL))
  } catch (err) {
    console.error("OAuth callback error:", err)
    return NextResponse.redirect(new URL("/sign-in?error=oauth_failed", APP_URL))
  }
}
