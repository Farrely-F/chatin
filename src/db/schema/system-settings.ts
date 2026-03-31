import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
