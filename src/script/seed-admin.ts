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
  const SYSTEM_ADMIN_PERMS = [
    { name: "System Create", permission: "system.create" },
    { name: "System Read", permission: "system.read" },
    { name: "System Delete", permission: "system.delete" },
  ];

  const userEmail = "dev@bdn.id";

  //   TODO: REPLACE PASSWORD
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
        name: "System Admin",
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
