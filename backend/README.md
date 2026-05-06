# BlueRes Search Backend

The backend contains the generic document search API, concrete deployments for
BlueRes jobs and resumes, and a Jetstream ingester for keeping docsearch in sync
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
FastAPI app with `docsearch.factory.create_app()`.

Run both APIs (from `backend/`):

```sh
env $(cat deployments/jobs/.env | xargs) uvicorn deployments.jobs.main_sentence_transformers:app --host 127.0.0.1 --port 8001 &
env $(cat deployments/resumes/.env | xargs) uvicorn deployments.resumes.main_sentence_transformers:app --host 127.0.0.1 --port 8002
```

### `jetstream`

Reusable ATProto Jetstream ingestion utilities.

The ingester listens for Jetstream commit events, filters to one collection,
builds the AT URI for each record, and calls the docsearch API:

- create/update events call `POST /documents`
- delete events call `DELETE /documents?url=...`

Run using a config file (from `backend/`):

```sh
python -m jetstream.cli --config jetstream/jobs.yaml
python -m jetstream.cli --config jetstream/resumes.yaml
```

See `jetstream/README.md` for configuration details.

## Configuration

Each deployment has its own `.env` file under `deployments/jobs/.env` and
`deployments/resumes/.env`. Common variables:

- `DATABASE_URL`: async Postgres connection URL (`postgresql+asyncpg://...`)
- `DOCSEARCH_API_KEY`: bearer token for regular API endpoints
- `DOCSEARCH_ADMIN_KEY`: bearer token for admin endpoints
- `OPENAI_API_KEY`: required when using the OpenAI embedder
- `EMBEDDING_DIMENSION`: vector dimension (must match the embedder)

## Development

From `backend/`:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

See `backend/.env.example` for required environment variables.
