DO $$
BEGIN
  CREATE TYPE "model_type" AS ENUM ('language', 'embedding');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ai_models"
  ADD COLUMN IF NOT EXISTS "model_type" "model_type" DEFAULT 'language' NOT NULL,
  ADD COLUMN IF NOT EXISTS "supports_custom_dimensions" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "supports_multimodal" boolean DEFAULT false NOT NULL;

UPDATE "ai_models"
SET "model_type" = 'embedding'
WHERE "name" ILIKE '%embedding%';
