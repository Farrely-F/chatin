CREATE TYPE "public"."agent_status" AS ENUM('active', 'archived');--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "temperature" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "top_p" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "similarity_threshold" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "top_k" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "persona_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "status" "agent_status" DEFAULT 'archived' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_slug_unique" UNIQUE("slug");