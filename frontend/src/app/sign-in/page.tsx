"use server"

import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getOauthClient } from "@/lib/oauth"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (session.did) redirect("/")

  const { error } = await searchParams

  async function initiateAuth(formData: FormData) {
    "use server"
    const handle = (formData.get("handle") as string).trim()
    const url = await getOauthClient()
      .authorize(handle, { scope: "atproto transition:generic" })
      .catch((err) => { console.error("[oauth] authorize failed:", err); return null })
    if (!url) redirect("/sign-in?error=resolve_failed")
    redirect(url.toString())
  }

  const errorMessages: Record<string, string> = {
    resolve_failed: "Couldn't resolve that handle. Make sure it's a valid Bluesky handle.",
    oauth_failed: "Authorization failed. Please try again.",
  }

  return (
    <div className="max-w-sm mx-auto mt-24 px-4 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Use your Bluesky handle to connect.
        </p>
      </div>

      <form action={initiateAuth} className="flex flex-col gap-3">
        <input
          name="handle"
          type="text"
          required
          autoComplete="username"
          placeholder="you.bsky.social"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--muted)",
            color: "var(--foreground)",
          }}
        />

        {error && (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
            {errorMessages[error] ?? "Something went wrong. Please try again."}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          Sign in with Bluesky
        </button>
      </form>
    </div>
  )
}
