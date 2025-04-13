import {
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const llmProviderEnum = pgEnum("llm_provider", [
  "openai",
  "anthropic",
  "google",
]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  systemPrompt: text("system_prompt"),
  llmProvider: llmProviderEnum("llm_provider").notNull(),
  modelName: text("model_name"),
  temperature: real("temperature").default(0.7),
  topP: real("top_p").default(1.0),
  similarityThreshold: real("similarity_threshold").default(0.5),
  topK: real("top_k").default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
