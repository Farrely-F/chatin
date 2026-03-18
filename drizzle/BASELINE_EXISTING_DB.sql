-- Use this only when the database schema already exists but drizzle.__drizzle_migrations
-- is empty or missing. It marks old migrations as already applied.

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  "id" serial PRIMARY KEY,
  "hash" text NOT NULL,
  "created_at" numeric
);

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT v.hash, v.created_at
FROM (
  VALUES
    ('e6f84b4db34c51a84d67f340cea5a54794b19c56d2d7091b08b697aa19aa0b15', 1744987236604),
    ('c957c9444270b97217918cd8173b5fff0a20ec7b602c7564ca8991cad4dbe1e2', 1745038785432),
    ('e93f12042196cb77a32a7e678f9228390b531b7a67dcb84cf1deb6863efd614a', 1745044249891)
) AS v(hash, created_at)
WHERE NOT EXISTS (
  SELECT 1
  FROM "drizzle"."__drizzle_migrations" m
  WHERE m.hash = v.hash
);