CREATE TYPE "public"."organization_member_role" AS ENUM('admin', 'member');--> statement-breakpoint

CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

CREATE TABLE "organization_members" (
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "organization_member_role" DEFAULT 'member' NOT NULL,
  "invited_by" uuid,
  "joined_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id", "user_id")
);
--> statement-breakpoint

CREATE TABLE "organization_user_roles" (
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  CONSTRAINT "organization_user_roles_organization_id_user_id_role_id_pk" PRIMARY KEY("organization_id", "user_id", "role_id")
);
--> statement-breakpoint

ALTER TABLE "agents" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "organization_id" uuid;--> statement-breakpoint

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_roles" ADD CONSTRAINT "organization_user_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_roles" ADD CONSTRAINT "organization_user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_roles" ADD CONSTRAINT "organization_user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "agents_organization_id_idx" ON "agents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "personas_organization_id_idx" ON "personas" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_user_roles_user_id_idx" ON "organization_user_roles" USING btree ("user_id");--> statement-breakpoint
