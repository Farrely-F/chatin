-- enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "public"."auth_provider" AS ENUM('email', 'google');--> statement-breakpoint
CREATE TYPE "public"."plan_name" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'anthropic', 'google');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'agent');--> statement-breakpoint
CREATE TYPE "public"."embedding_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('pdf', 'doc', 'txt', 'url', 'manual');--> statement-breakpoint
CREATE TYPE "public"."answer_preference" AS ENUM('short', 'moderate', 'long');--> statement-breakpoint
CREATE TYPE "public"."default_language" AS ENUM('english', 'indonesia');--> statement-breakpoint
CREATE TYPE "public"."emoji_usage" AS ENUM('never', 'normal', 'frequent');--> statement-breakpoint
CREATE TYPE "public"."formality" AS ENUM('friendly', 'neutral', 'formal');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'neutral');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text,
	"scopes" text[] DEFAULT '{"chat"}',
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone,
	"revoked" boolean DEFAULT false,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_name" "plan_name" DEFAULT 'free',
	"token_limit_monthly" integer,
	"chat_limit_monthly" integer,
	"reset_date" timestamp with time zone,
	CONSTRAINT "billing_plans_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"auth_provider" "auth_provider" DEFAULT 'email',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"persona_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "agent_status" DEFAULT 'archived' NOT NULL,
	"avatar_url" text,
	"system_prompt" text,
	"llm_provider" "llm_provider" NOT NULL,
	"model_name" text,
	"temperature" real DEFAULT 0.7 NOT NULL,
	"top_p" real DEFAULT 1 NOT NULL,
	"similarity_threshold" real DEFAULT 0.5 NOT NULL,
	"top_k" real DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "agents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_session_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"message" text,
	"tokens_used" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid,
	"session_token" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	CONSTRAINT "chat_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "knowledge_bases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_url" text,
	"file_name" text,
	"file_path" text,
	"content_text" text,
	"embedding_status" "embedding_status" DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chunk_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"knowledge_base_id" uuid NOT NULL,
	"content_chunk" text NOT NULL,
	"embedding_vector" vector(768) NOT NULL,
	"token_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"avatar" text,
	"name" text NOT NULL,
	"sex" "sex" DEFAULT 'neutral',
	"description" text,
	"answer_preference" "answer_preference" DEFAULT 'moderate',
	"formality" "formality" DEFAULT 'neutral',
	"emoji_usage" "emoji_usage" DEFAULT 'never',
	"default_language" "default_language" DEFAULT 'english',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permission" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plans" ADD CONSTRAINT "billing_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embedding_vector_idx" ON "chunk_embeddings" USING ivfflat ("embedding_vector" vector_cosine_ops);