import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const authProviderEnum = pgEnum("auth_provider", ["email", "google"]);
export const planNameEnum = pgEnum("plan_name", ["free", "pro", "enterprise"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  authProvider: authProviderEnum("auth_provider").default("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  keyHash: text("key_hash"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const billingPlans = pgTable("billing_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .unique()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planName: planNameEnum("plan_name").default("free"),
  tokenLimitMonthly: integer("token_limit_monthly"),
  chatLimitMonthly: integer("chat_limit_monthly"),
  resetDate: timestamp("reset_date", { withTimezone: true }),
});
