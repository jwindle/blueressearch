import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB, UUID

metadata = sa.MetaData()

documents = sa.Table(
    "documents",
    metadata,
    sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
    sa.Column("url", sa.Text, nullable=True, unique=True),
    sa.Column("data", JSONB, nullable=False),
    sa.Column("verified", sa.Boolean, nullable=True),
    sa.Column("deleted", sa.Boolean, nullable=False, server_default=sa.false()),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
)

extractors = sa.Table(
    "extractors",
    metadata,
    sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
    sa.Column("name", sa.Text, nullable=False, unique=True),
    sa.Column("class_name", sa.Text, nullable=False),
    sa.Column("config", JSONB, nullable=True),
)

# Vector(None) — dimension is enforced by the DB schema, not SQLAlchemy.
embeddings = sa.Table(
    "embeddings",
    metadata,
    sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
    sa.Column("document_id", UUID, sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
    sa.Column("extractor_id", UUID, sa.ForeignKey("extractors.id"), nullable=False),
    sa.Column("embedding", Vector(), nullable=False),
    sa.Column("subkey", sa.Text, nullable=True),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
)

searchable_fields = sa.Table(
    "searchable_fields",
    metadata,
    sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
    sa.Column("name", sa.Text, nullable=False, unique=True),
    sa.Column("json_path", sa.Text, nullable=False),
    sa.Column("field_type", sa.Text, nullable=False),  # 'string' | 'number' | 'boolean'
    sa.Column("index_type", sa.Text, nullable=False, server_default="btree"),  # 'btree' | 'trgm'
    sa.Column("description", sa.Text, nullable=True),
)


def get_create_tables_sql(embedding_dimension: int) -> list[str]:
    return [
        "CREATE EXTENSION IF NOT EXISTS vector",
        """
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            url TEXT UNIQUE,
            data JSONB NOT NULL,
            verified BOOLEAN,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS extractors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            class_name TEXT NOT NULL,
            config JSONB
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            extractor_id UUID NOT NULL REFERENCES extractors(id),
            embedding vector({embedding_dimension}) NOT NULL,
            subkey TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false",
        "CREATE EXTENSION IF NOT EXISTS pg_trgm",
        "CREATE INDEX IF NOT EXISTS idx_doc_url_trgm ON documents USING gin (url gin_trgm_ops)",
        """
        CREATE TABLE IF NOT EXISTS searchable_fields (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            json_path TEXT NOT NULL,
            field_type TEXT NOT NULL,
            index_type TEXT NOT NULL DEFAULT 'btree',
            description TEXT
        )
        """,
    ]
