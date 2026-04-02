-- Manual rollback script for 0009_add-organizations-multitenancy.sql
-- Run only if you need to fully revert organization multitenancy scaffolding.

DROP INDEX IF EXISTS "organization_user_roles_user_id_idx";
DROP INDEX IF EXISTS "organization_members_user_id_idx";
DROP INDEX IF EXISTS "personas_organization_id_idx";
DROP INDEX IF EXISTS "agents_organization_id_idx";

ALTER TABLE "personas" DROP CONSTRAINT IF EXISTS "personas_organization_id_organizations_id_fk";
ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "agents_organization_id_organizations_id_fk";
ALTER TABLE "organization_user_roles" DROP CONSTRAINT IF EXISTS "organization_user_roles_role_id_roles_id_fk";
ALTER TABLE "organization_user_roles" DROP CONSTRAINT IF EXISTS "organization_user_roles_user_id_users_id_fk";
ALTER TABLE "organization_user_roles" DROP CONSTRAINT IF EXISTS "organization_user_roles_organization_id_organizations_id_fk";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_invited_by_users_id_fk";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_user_id_users_id_fk";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_organization_id_organizations_id_fk";
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_created_by_users_id_fk";

ALTER TABLE "personas" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE "agents" DROP COLUMN IF EXISTS "organization_id";

DROP TABLE IF EXISTS "organization_user_roles";
DROP TABLE IF EXISTS "organization_members";
DROP TABLE IF EXISTS "organizations";
DROP TYPE IF EXISTS "organization_member_role";
