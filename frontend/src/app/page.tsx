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
          Semantic search and matching for job posts and résumés on the AT Protocol.
          Documents are broken into text chunks, embedded into a vector space, and
          retrieved by similarity — going beyond keyword matching to surface
          genuinely relevant results.
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
          description="Compare two documents — or free-form text — by embedding distance. See which sections align closely and get a headline average score, useful for evaluating job-to-candidate fit."
          links={[
            { href: "/match-and-edit-doc-doc",   label: "Doc vs Doc",   external: true },
            { href: "/match-and-edit-text-doc",  label: "Text vs Doc",  external: true },
            { href: "/match-and-edit-text-text", label: "Text vs Text", external: true },
          ]}
        />
        <FeatureCard
          title="Text To"
          description="Convert unstructured text into structured documents. Paste a raw job posting and an agent will parse it into a typed JSON object ready for indexing and search."
          links={[{ href: "/text-to-job-post", label: "Job Post" }]}
        />
      </div>

      {/* How it works */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
          How it works
        </h2>
        <ol className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          <li><span className="font-medium" style={{ color: "var(--foreground)" }}>1. Ingest.</span> Documents are fetched from the AT Protocol network and stored. Configurable extractors pull the text fields that matter for search.</li>
          <li><span className="font-medium" style={{ color: "var(--foreground)" }}>2. Embed.</span> Each extracted chunk is passed to an embedding model and stored as a vector alongside the source document.</li>
          <li><span className="font-medium" style={{ color: "var(--foreground)" }}>3. Search.</span> A query is embedded the same way and the closest vectors are returned — optionally filtered by metadata fields.</li>
        </ol>
      </div>

    </div>
  )
}
