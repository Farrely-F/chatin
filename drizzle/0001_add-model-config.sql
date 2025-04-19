CREATE TABLE "ai_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"description" text,
	"is_available" boolean DEFAULT true,
	"supports_image_input" boolean DEFAULT false NOT NULL,
	"supports_tool_use" boolean DEFAULT false NOT NULL,
	"supports_tool_streaming" boolean DEFAULT false NOT NULL,
	"supports_object_generation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "model_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "llm_provider";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "model_name";