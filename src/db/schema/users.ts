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
  key: text("key").notNull().unique(), // hashed key
  name: text("name"), // optional label like "My Bot Key"
  scopes: text("scopes").array().default(["chat"]), // optional scopes (for future usage)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // optional expiration
  revoked: boolean("revoked").default(false),
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
