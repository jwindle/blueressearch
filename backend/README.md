# BlueRes Search Backend

The backend contains the generic document search API, concrete deployments for
BlueRes jobs and resumes, and Jetstream ingesters for keeping docsearch in sync
with ATProto records.

## Packages

### `docsearch`

Generic JSON-to-vector-search package.

`docsearch` stores arbitrary JSON documents in Postgres, extracts selected text
from each document, embeds that text, and searches the resulting vectors with
pgvector. The package does not know about a specific lexicon or document type.
Deployments provide the domain-specific extractors that decide which JSON fields
become vectors.

See `docsearch/README.md` for details.

### `deployments`

Concrete app configurations for specific document collections.

Current deployments:

- `deployments.jobs`: job post search for `org.blueres.jobs.jobPost`
- `deployments.resumes`: resume search for `org.blueres.resume.resume`

Each deployment registers its own extractors and embedder, then creates a
FastAPI app with `docsearch.factory.create_app()`. Deployment modules also
include seed scripts for initializing searchable fields and Jetstream wrapper
commands for running collection-specific ingesters.

Example API startup:

```sh
DATABASE_URL=... uvicorn deployments.jobs.main_sentence_transformers:app --port 8001
DATABASE_URL=... uvicorn deployments.resumes.main_sentence_transformers:app --port 8002
```

### `jetstream`

Reusable ATProto Jetstream ingestion utilities.

The ingester listens for Jetstream commit events, filters to one collection,
builds the AT URI for each record, and calls the docsearch API:

- create/update events call `POST /documents`
- delete events call `DELETE /documents?url=...`

Deployment wrappers provide fixed collection IDs:

```sh
python -m deployments.jobs.jetstream run --base-url http://localhost:8001
python -m deployments.resumes.jetstream run --base-url http://localhost:8002
```

See `jetstream/README.md` for more usage details.

## Configuration

Common environment variables:

- `DATABASE_URL`: Postgres connection URL for a docsearch deployment
- `DOCSEARCH_API_KEY`: bearer token accepted by regular API endpoints
- `DOCSEARCH_ADMIN_KEY`: bearer token accepted by admin endpoints
- `OPENAI_API_KEY`: required when using the OpenAI embedder
- `JETSTREAM_ENDPOINT`: optional override for the Jetstream websocket endpoint

## Development

From `backend/`:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Run a deployment with `uvicorn`, then initialize its database with the matching
seed script.

