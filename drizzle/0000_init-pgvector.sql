-- migrations/000X_init-pgvector.sql

CREATE EXTENSION IF NOT EXISTS vector;

-- Optional: Create IVF index manually if not using ORM migration
-- CREATE INDEX embedding_vector_idx ON chunk_embeddings USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);