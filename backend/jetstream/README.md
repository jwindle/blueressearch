# Jetstream docsearch ingester

This package consumes ATProto Jetstream commit events and forwards matching records
to the existing docsearch HTTP API.

The ingester uses the AT URI as the document `url`:

```text
at://{did}/{collection}/{rkey}
```

Creates and updates call:

```http
POST /documents
```

Deletes call:

```http
DELETE /documents?url={encoded_at_uri}
```

## Deployment wrappers

Run commands from `backend/`.

```sh
python -m deployments.jobs.jetstream run --base-url http://localhost:8000
python -m deployments.resumes.jetstream run --base-url http://localhost:8001
```

Background management is also available:

```sh
python -m deployments.jobs.jetstream start --base-url http://localhost:8000
python -m deployments.jobs.jetstream status
python -m deployments.jobs.jetstream stop
```

Set `DOCSEARCH_API_KEY` in the environment or pass `--api-key` when the API
requires authentication. Use `--wanted-did did:...` to restrict ingestion to one
or more repositories.
