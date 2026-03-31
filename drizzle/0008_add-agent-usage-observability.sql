ALTER TABLE "agent_usage_logs"
ADD COLUMN "session_id" varchar(128),
ADD COLUMN "agent_version" varchar(64),
ADD COLUMN "retry_count" integer NOT NULL DEFAULT 0,
ADD COLUMN "is_error" boolean NOT NULL DEFAULT false,
ADD COLUMN "error_code" varchar(64),
ADD COLUMN "latency_ms" integer;
