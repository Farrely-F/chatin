import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { agents } from "./agents";

export const sourceTypeEnum = pgEnum("source_type", [
  "pdf",
  "doc",
  "txt",
  "url",
  "manual",
]);
export const embeddingStatusEnum = pgEnum("embedding_status", [
  "pending",
  "success",
  "failed",
]);

export const knowledgeBases = pgTable("knowledge_bases", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceUrl: text("source_url"),
  fileName: text("file_name"),
  filePath: text("file_path"),
  contentText: text("content_text"),
  embeddingStatus: embeddingStatusEnum("embedding_status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
