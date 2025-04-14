ALTER TABLE "agents" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_slug_unique" UNIQUE("slug");