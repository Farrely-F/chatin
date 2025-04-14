ALTER TABLE "agents" DROP CONSTRAINT "agents_slug_unique";--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "slug" DROP NOT NULL;