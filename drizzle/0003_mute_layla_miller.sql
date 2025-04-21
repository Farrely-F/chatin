ALTER TABLE "chunk_embeddings" DROP CONSTRAINT "chunk_embeddings_knowledge_base_id_knowledge_bases_id_fk";
--> statement-breakpoint
ALTER TABLE "chunk_embeddings" DROP CONSTRAINT "chunk_embeddings_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ALTER COLUMN "knowledge_base_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ALTER COLUMN "agent_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ALTER COLUMN "content_chunk" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ALTER COLUMN "token_count" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "embedding_vector_idx" ON "chunk_embeddings" USING ivfflat ("embedding_vector" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "chunk_embeddings" DROP COLUMN "created_at";