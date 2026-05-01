import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { backends } from "@/config/backends"
import { NavDropdown } from "@/components/NavDropdown"
import type { NavItem } from "@/components/NavDropdown"
import { getSession } from "@/lib/auth"
import { getOauthClient } from "@/lib/oauth"
import { redirect } from "next/navigation"

const yourJobsUrl = process.env.NEXT_PUBLIC_YOUR_JOBS_URL || null
const yourResumesUrl = process.env.NEXT_PUBLIC_YOUR_RESUMES_URL || null

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Blueres Search",
  description: "Vector search across Blueres deployments",
}

async function logout() {
  "use server"
  const session = await getSession()
  if (session.did) {
    try { await getOauthClient().revoke(session.did) } catch { /* best-effort */ }
  }
  session.destroy()
  redirect("/")
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const yourContentItems: NavItem[] = [
    ...(yourJobsUrl ? [{ href: yourJobsUrl, label: "Your Job Posts", external: true }] : []),
    ...(yourResumesUrl ? [{ href: yourResumesUrl, label: "Your Résumés", external: true }] : []),
  ]

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header
          className="border-b px-4 py-3 flex items-center gap-6"
          style={{ borderColor: "var(--border)" }}
        >
          <a href="/" className="font-semibold text-sm tracking-tight">
            BlueRes Search
          </a>
          <nav className="flex items-center gap-4">
            <NavDropdown
              label="Search"
              items={backends.map(b => ({ href: `/search/${b.id}`, label: b.name }))}
            />
            <NavDropdown
              label="Match"
              items={[
                { href: "/match-and-edit-doc-doc",   label: "Doc vs Doc" },
                { href: "/match-and-edit-text-doc",  label: "Text vs Doc" },
                { href: "/match-and-edit-text-text", label: "Text vs Text" },
              ]}
            />
            <NavDropdown
              label="Refine"
              items={[
                { href: "/refine-resume-helper", label: "Resume" },
              ]}
            />
            <NavDropdown
              label="Text To"
              items={[
                { href: "/text-to-job-post", label: "Job Post" },
                { href: "/text-to-resume", label: "Resume" },
              ]}
            />
            {yourContentItems.length > 0 && (
              <NavDropdown label="Your Content" items={yourContentItems} />
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {session.did ? (
              <>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {session.handle ?? session.did}
                </span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-xs px-3 py-1 rounded border transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <a
                href="/sign-in"
                className="text-xs px-3 py-1 rounded border transition-colors"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                Sign in
              </a>
            )}
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
