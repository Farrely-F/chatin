CREATE TABLE "agent_usage_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "model_id" uuid NOT NULL,
  "request_user_id" text,
  "source" varchar(32) DEFAULT 'stream' NOT NULL,
  "provider" varchar(100) NOT NULL,
  "input_tokens" integer DEFAULT 0 NOT NULL,
  "output_tokens" integer DEFAULT 0 NOT NULL,
  "cached_input_tokens" integer DEFAULT 0 NOT NULL,
  "total_tokens" integer DEFAULT 0 NOT NULL,
  "cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
  "fx_usd_to_idr" numeric(12, 4) DEFAULT '16000' NOT NULL,
  "cost_idr" numeric(14, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "agent_usage_logs"
  ADD CONSTRAINT "agent_usage_logs_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id")
  REFERENCES "public"."agents"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "agent_usage_logs"
  ADD CONSTRAINT "agent_usage_logs_model_id_ai_models_id_fk"
  FOREIGN KEY ("model_id")
  REFERENCES "public"."ai_models"("id")
  ON DELETE restrict
  ON UPDATE no action;

CREATE INDEX "agent_usage_logs_created_at_idx"
  ON "agent_usage_logs" ("created_at");

CREATE INDEX "agent_usage_logs_provider_created_at_idx"
  ON "agent_usage_logs" ("provider", "created_at");

CREATE INDEX "agent_usage_logs_agent_created_at_idx"
  ON "agent_usage_logs" ("agent_id", "created_at");

CREATE INDEX "agent_usage_logs_model_created_at_idx"
  ON "agent_usage_logs" ("model_id", "created_at");
