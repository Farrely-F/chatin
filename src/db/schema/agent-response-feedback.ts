import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { agents } from "./agents";
import { users } from "./users";

export const agentResponseFeedback = pgTable("agent_response_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assistantMessageId: text("assistant_message_id").notNull(),
  isHelpful: boolean("is_helpful").notNull().default(false),
  userQuestion: text("user_question").notNull(),
  agentResponse: text("agent_response").notNull(),
  expectedResponse: text("expected_response"),
  feedbackNote: text("feedback_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type AgentResponseFeedback = typeof agentResponseFeedback.$inferSelect;
