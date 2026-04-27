# BlueRes Search Frontend

Next.js frontend for searching, comparing, and creating documents for the
BlueRes docsearch backends.

The app expects docsearch API backends for jobs and resumes. Server-side API
proxy targets are configured with:

- `JOBS_API_URL`
- `RESUMES_API_URL`

Optional external navbar links can be configured with:

- `NEXT_PUBLIC_YOUR_JOBS_URL`
- `NEXT_PUBLIC_YOUR_RESUMES_URL`

## Navbar Pages

### BlueRes Search

Route: `/`

Redirects to the default search page for the first configured backend.

### Jobs

Route: `/search/jobs`

Searches the jobs docsearch backend. The jobs backend is configured for the
`org.blueres.jobs.jobPost` ATProto collection and renders results as job post
cards. Search supports the available backend modes, including Top 1 and Top K.

### Résumés

Route: `/search/resumes`

Searches the resumes docsearch backend. The resumes backend is configured for
the `org.blueres.resume.resume` ATProto collection and renders results as
resume cards. Search supports the available backend modes, including Top 1 and
Top K.

### Text to Job Post

Route: `/text-to-job-post`

Converts plain text job descriptions into structured job post JSON suitable for
the jobs backend.

### Match & Edit

Route: `/match-and-edit`

Opens a matching and editing workspace in a new tab. This page is used to
compare job and resume content, inspect embedding matches, and edit candidate
document JSON.

### Your Job Posts

External link. Shown only when `NEXT_PUBLIC_YOUR_JOBS_URL` is set.

Links to the separate BlueRes jobs app for managing the current user's job
posts.

### Your Résumés

External link. Shown only when `NEXT_PUBLIC_YOUR_RESUMES_URL` is set.

Links to the separate BlueRes resumes app for managing the current user's
resumes.

## Other Routes

- `/add/[backendId]`: add a document from an ATProto record into a docsearch
  backend.
- `/document/[backendId]/[docId]`: inspect a stored document.
- `/match`: compare a selected job and resume from search-result links.
- `/matchedit`: legacy redirect to `/match-and-edit`.

## Development

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.
