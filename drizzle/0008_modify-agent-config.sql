ALTER TABLE "agents" ADD COLUMN "top_p" real DEFAULT 1;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "similarity_threshold" real DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "top_k" real DEFAULT 5;