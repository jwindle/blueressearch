import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { backends } from "@/config/backends"
import Link from "next/link"

function ExternalLinkIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block ml-0.5 translate-y-[-1px]"
    >
      <path d="M4 2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6" />
      <path d="M6.5 1H9v2.5M9 1 5 5" />
    </svg>
  )
}

const yourJobsUrl = process.env.NEXT_PUBLIC_YOUR_JOBS_URL || null
const yourResumesUrl = process.env.NEXT_PUBLIC_YOUR_RESUMES_URL || null

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Blueres Search",
  description: "Vector search across Blueres deployments",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header
          className="border-b px-4 py-3 flex items-center gap-6"
          style={{ borderColor: "var(--border)" }}
        >
          <Link href="/" className="font-semibold text-sm tracking-tight">
            BlueRes Search
          </Link>
          <nav className="flex items-center gap-4">
            {backends.map(b => (
              <Link
                key={b.id}
                href={`/search/${b.id}`}
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--muted-foreground)" }}
              >
                {b.name}
              </Link>
            ))}
            <Link
              href="/text-to-job-post"
              className="text-sm hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted-foreground)" }}
            >
              Text to Job Post
            </Link>
            <a
              href="/match-and-edit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:opacity-70 transition-opacity"
              style={{ color: "var(--muted-foreground)" }}
            >
              Match &amp; Edit<ExternalLinkIcon />
            </a>
            {yourJobsUrl && (
              <a
                href={yourJobsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--muted-foreground)" }}
              >
                Your Job Posts<ExternalLinkIcon />
              </a>
            )}
            {yourResumesUrl && (
              <a
                href={yourResumesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: "var(--muted-foreground)" }}
              >
                Your Résumés<ExternalLinkIcon />
              </a>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
