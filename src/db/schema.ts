import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const authProviderEnum = pgEnum("auth_provider", ["email", "google"]);
export const llmProviderEnum = pgEnum("llm_provider", [
  "openai",
  "claude",
  "gemini",
]);
export const sourceTypeEnum = pgEnum("source_type", [
  "pdf",
  "doc",
  "txt",
  "url",
  "manual",
]);
export const embeddingStatusEnum = pgEnum("embedding_status", [
  "pending",
  "success",
  "failed",
]);
export const roleEnum = pgEnum("role", ["user", "agent"]);
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

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  systemPrompt: text("system_prompt"),
  llmProvider: llmProviderEnum("llm_provider").notNull(),
  modelName: text("model_name"),
  temperature: real("temperature").default(0.7),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const knowledgeBases = pgTable("knowledge_bases", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceUrl: text("source_url"),
  fileName: text("file_name"),
  filePath: text("file_path"),
  contentText: text("content_text"),
  embeddingStatus: embeddingStatusEnum("embedding_status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const chunkEmbeddings = pgTable("chunk_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  knowledgeBaseId: uuid("knowledge_base_id")
    .notNull()
    .references(() => knowledgeBases.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  contentChunk: text("content_chunk"),
  embeddingVector: vector("embedding_vector", { dimensions: 768 }).notNull(),
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

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
