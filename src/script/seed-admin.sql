-- Insert system permissions
INSERT INTO permissions (name, permission)
VALUES 
  ('System Create', 'system.create'),
  ('System Read', 'system.read'),
  ('System Delete', 'system.delete')
ON CONFLICT (permission) DO NOTHING;


-- Insert system admin role
INSERT INTO roles (id, name)
VALUES (gen_random_uuid(), 'System Admin')
ON CONFLICT (name) DO NOTHING;


-- Get the role ID for 'System Admin'
WITH role_cte AS (
  SELECT id FROM roles WHERE name = 'System Admin'
),
perm_cte AS (
  SELECT id FROM permissions WHERE permission IN ('system.create', 'system.read', 'system.delete')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_cte r, perm_cte p
ON CONFLICT DO NOTHING;

-- Insert user REPLACE PASSWORD
INSERT INTO users (name, email, password_hash, auth_provider)
VALUES (
  'System Admin',
  'dev@bdn.id',
  '<PASSWORD>',
  'email'
)
ON CONFLICT (email) DO NOTHING;

-- Assign role to user
WITH user_cte AS (
  SELECT id FROM users WHERE email = 'dev@bdn.id'
),
role_cte AS (
  SELECT id FROM roles WHERE name = 'System Admin'
)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM user_cte u, role_cte r
ON CONFLICT DO NOTHING;
