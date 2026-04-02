// scripts/seed.ts
import { db } from "@/db";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedSystemAdmin() {
  const SYSTEM_ADMIN_ROLE = "system_admin";
  const ORG_ADMIN_ROLE = "organization_admin";
  const ORG_MEMBER_ROLE = "organization_member";
  const SYSTEM_ADMIN_PERMS = [
    { name: "System Create", permission: "system.create" },
    { name: "System Read", permission: "system.read" },
    { name: "System Delete", permission: "system.delete" },
    { name: "Monitoring Read", permission: "monitoring.read" },
    { name: "Organization Manage", permission: "organization.manage" },
    { name: "Organization Read", permission: "organization.read" },
    { name: "Agent Read", permission: "agent.read" },
    { name: "Agent Create", permission: "agent.create" },
    { name: "Persona Read", permission: "persona.read" },
    { name: "Persona Create", permission: "persona.create" },
  ];

  const ORG_ADMIN_PERMISSIONS = [
    "organization.manage",
    "organization.read",
    "monitoring.read",
    "agent.read",
    "agent.create",
    "persona.read",
    "persona.create",
  ];

  const ORG_MEMBER_PERMISSIONS = [
    "organization.read",
    "agent.read",
    "persona.read",
  ];

  const userEmail = "dev@bdn.id";

  const hashedPassword = await bcrypt.hash("<password>", 10);

  // Create permissions (if not exists)
  const insertedPermissions = await Promise.all(
    SYSTEM_ADMIN_PERMS.map(async (perm) => {
      const existing = await db
        .select()
        .from(permissions)
        .where(eq(permissions.permission, perm.permission));

      if (existing.length > 0) return existing[0];

      const [created] = await db
        .insert(permissions)
        .values({
          name: perm.name,
          permission: perm.permission,
        })
        .returning();

      return created;
    }),
  );

  // Create role (if not exists)
  const existingRole = await db
    .select()
    .from(roles)
    .where(eq(roles.name, SYSTEM_ADMIN_ROLE));

  let systemAdminRole = existingRole[0];

  if (!systemAdminRole) {
    const [createdRole] = await db
      .insert(roles)
      .values({
        id: crypto.randomUUID(),
        name: SYSTEM_ADMIN_ROLE,
        description: "System Administrator",
      })
      .returning();

    systemAdminRole = createdRole;

    // Link permissions to role
    const rolePerms = insertedPermissions.map((perm) => ({
      roleId: systemAdminRole.id,
      permissionId: perm.id,
    }));

    await db.insert(rolePermissions).values(rolePerms);
  }

  const existingOrgAdminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.name, ORG_ADMIN_ROLE));

  let organizationAdminRole = existingOrgAdminRole[0];

  if (!organizationAdminRole) {
    const [createdRole] = await db
      .insert(roles)
      .values({
        id: crypto.randomUUID(),
        name: ORG_ADMIN_ROLE,
        description: "Organization Administrator",
      })
      .returning();

    organizationAdminRole = createdRole;
  }

  const existingOrgMemberRole = await db
    .select()
    .from(roles)
    .where(eq(roles.name, ORG_MEMBER_ROLE));

  let organizationMemberRole = existingOrgMemberRole[0];

  if (!organizationMemberRole) {
    const [createdRole] = await db
      .insert(roles)
      .values({
        id: crypto.randomUUID(),
        name: ORG_MEMBER_ROLE,
        description: "Organization Member",
      })
      .returning();

    organizationMemberRole = createdRole;
  }

  const permissionByCode = new Map(
    insertedPermissions.map((permission) => [
      permission.permission,
      permission,
    ]),
  );

  const ensureRolePermissions = async (
    roleId: string,
    permissionCodes: string[],
  ) => {
    for (const code of permissionCodes) {
      const permission = permissionByCode.get(code);

      if (!permission) {
        continue;
      }

      const existing = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      if (
        existing.some(
          (row) => row.roleId === roleId && row.permissionId === permission.id,
        )
      ) {
        continue;
      }

      await db.insert(rolePermissions).values({
        roleId,
        permissionId: permission.id,
      });
    }
  };

  await ensureRolePermissions(organizationAdminRole.id, ORG_ADMIN_PERMISSIONS);
  await ensureRolePermissions(
    organizationMemberRole.id,
    ORG_MEMBER_PERMISSIONS,
  );

  // Create user (if not exists)
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail));

  if (existingUser.length === 0) {
    const [user] = await db
      .insert(users)
      .values({
        name: "System Admin",
        email: userEmail,
        passwordHash: hashedPassword,
        authProvider: "email",
      })
      .returning();

    await db.insert(userRoles).values({
      userId: user.id,
      roleId: systemAdminRole.id,
    });
  }

  console.log("✅ Seeded system admin user");
}

seedSystemAdmin()
  .then(() => {
    console.log("🌱 Done seeding.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
