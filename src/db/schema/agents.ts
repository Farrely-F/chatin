import {
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { aiModels } from "./models";
import { organizations } from "./organizations";
import { personas } from "./personas";
import { users } from "./users";

export const llmProviderEnum = pgEnum("llm_provider", [
  "openai",
  "anthropic",
  "google",
]);

export const agentStatusEnum = pgEnum("agent_status", ["active", "archived"]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  personaId: uuid("persona_id").references(() => personas.id, {
    onDelete: "set null",
  }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: agentStatusEnum("status").notNull().default("archived"),
  avatarUrl: text("avatar_url"),
  systemPrompt: text("system_prompt"),
  modelId: uuid("model_id")
    .notNull()
    .references(() => aiModels.id, {
      onDelete: "restrict",
    }),
  temperature: real("temperature").notNull().default(0.7),
  topP: real("top_p").notNull().default(1),
  similarityThreshold: real("similarity_threshold").notNull().default(0.5),
  topK: real("top_k").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
