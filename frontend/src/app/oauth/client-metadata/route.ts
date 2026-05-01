import { NextResponse } from "next/server"
import { getOauthClient } from "@/lib/oauth"

// The URL of this endpoint must match `client_id` in src/lib/oauth.ts.
// Bluesky's PDS fetches it to validate the client, so it must be publicly reachable.
export async function GET() {
  return NextResponse.json(getOauthClient().clientMetadata, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  })
}
