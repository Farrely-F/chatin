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
ALTER TABLE "personas" ADD CONSTRAINT "personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;