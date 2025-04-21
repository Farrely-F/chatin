// drizzle/schema/ai_models.ts
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const aiModels = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 100 }).notNull(),
  description: text("description"),
  isAvailable: boolean("is_available").default(true),
  supportsImageInput: boolean("supports_image_input").default(false).notNull(),
  supportsToolUse: boolean("supports_tool_use").default(false).notNull(),
  supportsToolStreaming: boolean("supports_tool_streaming")
    .default(false)
    .notNull(),
  supportsObjectGeneration: boolean("supports_object_generation")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
