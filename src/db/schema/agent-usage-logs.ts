import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { agents } from "./agents";
import { aiModels } from "./models";

export const agentUsageLogs = pgTable("agent_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  modelId: uuid("model_id")
    .notNull()
    .references(() => aiModels.id, { onDelete: "restrict" }),
  requestUserId: text("request_user_id"),
  source: varchar("source", { length: 32 }).notNull().default("stream"),
  provider: varchar("provider", { length: 100 }).notNull(),
  sessionId: varchar("session_id", { length: 128 }),
  agentVersion: varchar("agent_version", { length: 64 }),
  retryCount: integer("retry_count").notNull().default(0),
  isError: boolean("is_error").notNull().default(false),
  errorCode: varchar("error_code", { length: 64 }),
  latencyMs: integer("latency_ms"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 12, scale: 6 })
    .notNull()
    .default("0"),
  fxUsdToIdr: numeric("fx_usd_to_idr", { precision: 12, scale: 4 })
    .notNull()
    .default("16000"),
  costIdr: numeric("cost_idr", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AgentUsageLog = typeof agentUsageLogs.$inferSelect;
