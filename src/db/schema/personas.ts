import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";

export const emojiUsageEnum = pgEnum("emoji_usage", [
  "never",
  "normal",
  "frequent",
]);
export const answerPreferenceEnum = pgEnum("answer_preference", [
  "short",
  "moderate",
  "long",
]);
export const defaultLanguageEnum = pgEnum("default_language", [
  "english",
  "indonesia",
]);
export const sexEnum = pgEnum("sex", ["male", "female", "neutral"]);
export const formalityEnum = pgEnum("formality", [
  "friendly",
  "neutral",
  "formal",
]);

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  avatar: text("avatar"),
  name: text("name").notNull(),
  sex: sexEnum("sex").default("neutral"),
  description: text("description"),
  answerPreference:
    answerPreferenceEnum("answer_preference").default("moderate"),
  formality: formalityEnum("formality").default("neutral"),
  emojiUsage: emojiUsageEnum("emoji_usage").default("never"),
  defaultLanguage: defaultLanguageEnum("default_language").default("english"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
