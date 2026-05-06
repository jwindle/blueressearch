# BlueRes Search Frontend

Next.js frontend for searching, comparing, and creating documents for the
BlueRes docsearch backends.

## Environment Variables

### Required

- `JOBS_API_URL` — URL of the jobs docsearch backend
- `RESUMES_API_URL` — URL of the resumes docsearch backend
- `FRONTEND_DATABASE_URL` — Postgres connection string (pooled)
- `FRONTEND_DATABASE_DIRECT_URL` — Postgres connection string (direct, for migrations)
- `APP_URL` — Public URL of this app (used for ATProto OAuth)
- `SESSION_SECRET` — Secret for signing session cookies (min 32 chars)
- `DOCSEARCH_API_KEY` — API key for the docsearch backends
- `DOCSEARCH_ADMIN_KEY` — Admin API key for the docsearch backends
- `OPENAI_API_KEY` — OpenAI API key (required for Text To pages)

### Optional

- `ENABLE_ADVANCED=true` — Enables the Text To pages (disabled by default)
- `NEXT_PUBLIC_YOUR_JOBS_URL` — External link shown in the navbar under "Your Content"
- `NEXT_PUBLIC_YOUR_RESUMES_URL` — External link shown in the navbar under "Your Content"

## Pages

### Search

Route: `/search/[backendId]`

Semantic search over the jobs or resumes backend. Supports three modes:

- **Nearest neighbour** — returns the single closest document
- **Top-K chunk** — returns the top-K closest chunks, deduplicated by document
- **Multi-query** — runs multiple query variants and merges results

### Match

Routes: `/match-and-edit-doc-doc`, `/match-and-edit-text-doc`, `/match-and-edit-text-text`

Compare two documents (or free-form text) by embedding distance. Shows per-section
similarity scores and a headline average. Opens in a new tab.

### Refine

Route: `/refine-resume-helper`

Interactive resume refinement tool. Requires authentication.

### Text To (requires `ENABLE_ADVANCED=true`)

- `/text-to-job-post` — Paste unstructured job post text; an LLM segments it into
  labelled sections, which you can review and edit before generating structured JSON.
- `/text-to-resume` — Same two-step flow for résumés.

### Admin

Route: `/admin/usage`

Usage statistics table. Only accessible to actors with `role = "admin"` in the database.

### Other Routes

- `/add/[backendId]` — Add a document from an ATProto record into a backend
- `/document/[backendId]/[docId]` — Inspect a stored document
- `/sign-in` — Bluesky OAuth sign-in

## Development

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.
