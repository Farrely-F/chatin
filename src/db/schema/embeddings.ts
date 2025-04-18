import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

import { agents } from "./agents";
import { knowledgeBases } from "./knowledgebases";

export const chunkEmbeddings = pgTable(
  "chunk_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),

    knowledgeBaseId: uuid("knowledge_base_id")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    contentChunk: text("content_chunk").notNull(),
    embeddingVector: vector("embedding_vector", { dimensions: 768 }).notNull(),
    tokenCount: integer("token_count").notNull(),
  },
  (table) => [
    index("embedding_vector_idx").using(
      "ivfflat",
      table.embeddingVector.op("vector_cosine_ops"),
    ),
  ],
);
