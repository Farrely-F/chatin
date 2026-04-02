INSERT INTO "permissions" ("name", "permission") VALUES
  ('Monitoring Read', 'monitoring.read'),
  ('Organization Manage', 'organization.manage'),
  ('Organization Read', 'organization.read')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint

INSERT INTO "roles" ("name", "description")
SELECT 'Organization Admin', 'Organization Administrator'
WHERE NOT EXISTS (
  SELECT 1 FROM "roles" WHERE "name" = 'Organization Admin'
);
--> statement-breakpoint

INSERT INTO "roles" ("name", "description")
SELECT 'Organization Member', 'Organization Member'
WHERE NOT EXISTS (
  SELECT 1 FROM "roles" WHERE "name" = 'Organization Member'
);
--> statement-breakpoint

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'Organization Admin'
  AND p.permission IN ('organization.manage', 'organization.read', 'monitoring.read')
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
--> statement-breakpoint

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.name = 'Organization Member'
  AND p.permission IN ('organization.read')
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );