import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permission: text("permission").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
