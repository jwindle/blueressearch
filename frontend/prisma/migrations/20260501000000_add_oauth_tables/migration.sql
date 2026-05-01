CREATE TABLE "oauth_states" (
  "key"        TEXT        PRIMARY KEY,
  "data"       JSONB       NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "oauth_sessions" (
  "key"        TEXT        PRIMARY KEY,
  "data"       JSONB       NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
