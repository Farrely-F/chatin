ALTER TABLE "public"."agents" ALTER COLUMN "llm_provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."llm_provider";--> statement-breakpoint
CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'anthropic', 'google');--> statement-breakpoint
ALTER TABLE "public"."agents" ALTER COLUMN "llm_provider" SET DATA TYPE "public"."llm_provider" USING "llm_provider"::"public"."llm_provider";