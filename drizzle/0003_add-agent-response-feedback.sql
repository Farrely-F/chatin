CREATE TABLE "agent_response_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "assistant_message_id" text NOT NULL,
  "is_helpful" boolean DEFAULT false NOT NULL,
  "user_question" text NOT NULL,
  "agent_response" text NOT NULL,
  "expected_response" text,
  "feedback_note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "agent_response_feedback"
  ADD CONSTRAINT "agent_response_feedback_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id")
  REFERENCES "public"."agents"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "agent_response_feedback"
  ADD CONSTRAINT "agent_response_feedback_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."users"("id")
  ON DELETE cascade
  ON UPDATE no action;