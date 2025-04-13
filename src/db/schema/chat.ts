import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { agents } from "./agents";
import { users } from "./users";

export const roleEnum = pgEnum("role", ["user", "agent"]);

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  sessionToken: text("session_token").unique(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatSessionId: uuid("chat_session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  message: text("message"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
