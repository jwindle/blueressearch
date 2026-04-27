# Docsearch

`docsearch` is a generic JSON document search API backed by Postgres and
pgvector. It stores arbitrary JSON documents, extracts text from those
documents, embeds that text, and supports vector search over the resulting
embeddings.

The package is not tied to jobs, resumes, or any specific lexicon. A deployment
defines the document shape by registering extractors.

## Data Model

Documents are stored in the `documents` table:

- `url`: optional stable external identifier, such as an AT URI
- `data`: arbitrary JSON document data
- `verified`: optional verification flag
- `deleted`: soft-delete flag

Embeddings are stored separately in the `embeddings` table and point back to a
document and an extractor. A single document can produce many embeddings.

## Extractors

An extractor defines how to turn a JSON document into one or more text strings
for embedding.

Each extractor implements:

- `name`: stable display/storage name for the extractor
- `get_keys()`: JSON fields the extractor reads
- `extract_texts(data)`: returns `(text, subkey)` pairs

The `subkey` identifies which part of the document produced a vector. For
example, an extractor over an array can use subkeys like `[0].summary` or
`[2].highlights[1]`.

Built-in extractor helpers include:

- `ConcatExtractor`: concatenate top-level fields into one text
- `TemplateExtractor`: render a format string from document fields
- `ArrayExtractor`: embed each array item separately

Deployments can also define custom extractors for nested or domain-specific
JSON structures.

## Embedders

The API uses an embedder implementation to convert extracted text into vectors.
Current embedders include:

- `SentenceTransformerEmbedder`
- `OpenAIEmbedder`

The selected embedder determines the vector dimension used when initializing the
database.

## API Surface

The FastAPI app exposes endpoints for:

- inserting/upserting documents
- soft-deleting documents by id or by URL
- embedding a document without storing it
- searching embeddings
- registering searchable JSON fields
- initializing and maintaining database tables/indexes

`create_app()` wires together a registry, database URL, and embedder into a
FastAPI application.

## Deployment Pattern

A deployment creates:

1. an embedder
2. a `Registry`
3. one or more extractors
4. a FastAPI app via `create_app()`

The jobs and resumes deployments under `backend/deployments/` are examples of
this pattern.

