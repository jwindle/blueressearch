import Link from "next/link"
import { backends } from "@/config/backends"

function FeatureCard({
  title,
  description,
  links,
}: {
  title: string
  description: string
  links: { href: string; label: string; external?: boolean }[]
}) {
  return (
    <div
      className="rounded-xl border p-6 space-y-3 flex flex-col"
      style={{ borderColor: "var(--border)", background: "var(--muted)" }}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm flex-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        {description}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {links.map(link =>
          link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded border hover:opacity-70 transition-opacity"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {link.label} ↗
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs px-3 py-1.5 rounded border hover:opacity-70 transition-opacity"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {link.label}
            </Link>
          )
        )}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">

      {/* Hero */}
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">BlueRes Search</h1>
        <p className="text-lg leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Résumés and job posts are public data — so why shouldn't the matching
          process be transparent too? BlueRes Search is a proof-of-concept that
          uses semantic embeddings to search and match job posts and résumés on
          the AT Protocol, without relying on a black-box AI.
        </p>
        <p className="text-base leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Both document types are broken into structured fields, embedded into
          a shared vector space, and retrieved or compared by similarity. The
          goal is to show that job-to-candidate matching can be done in a way
          that is open, inspectable, and clearly articulated — no magic required.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Search"
          description="Query job posts or résumés by meaning, not just keywords. Choose between nearest-neighbour, top-K chunk, and multi-query modes to control how results are ranked and deduplicated."
          links={backends.map(b => ({ href: `/search/${b.id}`, label: b.name }))}
        />
        <FeatureCard
          title="Match"
          description="Compare two documents — or free-form text — by embedding distance. For each section in a reference document, find the closest match in the other and average the scores."
          links={[
            { href: "/match-and-edit-doc-doc",   label: "Doc vs Doc",   external: true },
            { href: "/match-and-edit-text-doc",  label: "Text vs Doc",  external: true },
            { href: "/match-and-edit-text-text", label: "Text vs Text", external: true },
          ]}
        />
        <FeatureCard
          title="Text To"
          description="Convert unstructured text into structured JSON. Paste a raw job posting or résumé and an LLM will segment and parse it into a typed document ready for indexing."
          links={[
            { href: "/text-to-job-post", label: "Job Post" },
            { href: "/text-to-resume",   label: "Résumé" },
          ]}
        />
      </div>

      {/* How it works */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          How it works
        </h2>
        <ol className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          <li><span className="font-medium" style={{ color: "var(--foreground)" }}>1. Structure.</span> Raw job posts and résumés are parsed into typed JSON schemas — job posts using a custom schema, résumés using jsonresume.</li>
          <li><span className="font-medium" style={{ color: "var(--foreground)" }}>2. Embed.</span> Configurable extractors pull the text fields that matter, each chunk is passed to an embedding model, and the vectors are stored alongside the source document.</li>
          <li><span className="font-medium" style={{ color: "var(--foreground)" }}>3. Search or match.</span> A query or reference document is embedded the same way. Search returns the closest documents; matching scores each section pair and averages the result.</li>
        </ol>
      </div>

    </div>
  )
}
