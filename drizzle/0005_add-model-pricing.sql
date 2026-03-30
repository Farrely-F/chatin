ALTER TABLE "ai_models"
  ADD COLUMN "input_cost_per_1m_tokens" numeric(12, 6) DEFAULT '0' NOT NULL,
  ADD COLUMN "output_cost_per_1m_tokens" numeric(12, 6) DEFAULT '0' NOT NULL;
