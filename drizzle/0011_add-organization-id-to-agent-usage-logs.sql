ALTER TABLE "agent_usage_logs" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_usage_logs" ADD CONSTRAINT "agent_usage_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_usage_logs_organization_id_idx" ON "agent_usage_logs" USING btree ("organization_id");--> statement-breakpoint
