// drizzle/schema/ai_models.ts
import {
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const modelTypeEnum = pgEnum("model_type", ["language", "embedding"]);

export const aiModels = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  modelType: modelTypeEnum("model_type").notNull().default("language"),
  description: text("description"),
  isAvailable: boolean("is_available").default(true),
  supportsImageInput: boolean("supports_image_input").default(false).notNull(),
  supportsCustomDimensions: boolean("supports_custom_dimensions")
    .default(false)
    .notNull(),
  supportsMultimodal: boolean("supports_multimodal").default(false).notNull(),
  supportsToolUse: boolean("supports_tool_use").default(false).notNull(),
  supportsToolStreaming: boolean("supports_tool_streaming")
    .default(false)
    .notNull(),
  supportsObjectGeneration: boolean("supports_object_generation")
    .default(false)
    .notNull(),
  inputCostPer1mTokens: numeric("input_cost_per_1m_tokens", {
    precision: 12,
    scale: 6,
  })
    .notNull()
    .default("0"),
  outputCostPer1mTokens: numeric("output_cost_per_1m_tokens", {
    precision: 12,
    scale: 6,
  })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
