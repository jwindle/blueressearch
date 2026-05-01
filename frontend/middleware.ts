import { NextResponse, type NextRequest } from "next/server"

// Prefixes that require a session cookie. Add routes here to protect them.
// Actual session validation (DID check) happens in each Server Component.
const PROTECTED: string[] = []

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Feature flag gate
  if (pathname.startsWith("/text-to-job-post") && process.env.ENABLE_ADVANCED !== "true") {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // Auth gate
  if (PROTECTED.some(p => pathname.startsWith(p))) {
    if (!request.cookies.get("blueressearch_session")) {
      return NextResponse.redirect(new URL("/sign-in", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/text-to-job-post/:path*"],
}
