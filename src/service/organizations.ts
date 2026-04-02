"use server";

import { db } from "@/db";
import {
  agents,
  organizationMembers,
  organizationUserRoles,
  organizations,
  personas,
  roles,
  users,
} from "@/db/schema";
import { hasPermission, hasScopedPermission } from "@/lib/check-permission";
import { slugify } from "@/lib/utils";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type CreateOrganizationInput = {
  name: string;
  description?: string;
};

export type OrganizationMemberInfo = {
  userId: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
  joinedAt: Date | null;
};

export type OrganizationOverview = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date | null;
  memberCount: number;
  members: OrganizationMemberInfo[];
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date | null;
};

export type InvitableUser = {
  id: string;
  email: string;
  name: string | null;
};

export type UpdateOrganizationInput = {
  name: string;
  description?: string;
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type DefaultOrganizationRoleIds = {
  admin: string;
  member: string;
};

async function getDefaultOrganizationRoleIds(
  trx: DbTransaction,
): Promise<DefaultOrganizationRoleIds | { error: string }> {
  const roleRows = await trx
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(inArray(roles.name, ["Organization Admin", "Organization Member"]));

  const adminRoleId = roleRows.find(
    (role) => role.name === "Organization Admin",
  )?.id;
  const memberRoleId = roleRows.find(
    (role) => role.name === "Organization Member",
  )?.id;

  if (!adminRoleId || !memberRoleId) {
    return {
      error:
        "Required organization roles are missing (Organization Admin / Organization Member)",
    };
  }

  return {
    admin: adminRoleId,
    member: memberRoleId,
  };
}

async function syncDefaultOrganizationRoleForMember(
  trx: DbTransaction,
  organizationId: string,
  userId: string,
  membershipRole: "admin" | "member",
  defaultRoleIds: DefaultOrganizationRoleIds,
) {
  const targetRoleId =
    membershipRole === "admin" ? defaultRoleIds.admin : defaultRoleIds.member;

  await trx
    .delete(organizationUserRoles)
    .where(
      and(
        eq(organizationUserRoles.organizationId, organizationId),
        eq(organizationUserRoles.userId, userId),
        inArray(organizationUserRoles.roleId, [
          defaultRoleIds.admin,
          defaultRoleIds.member,
        ]),
      ),
    );

  await trx.insert(organizationUserRoles).values({
    organizationId,
    userId,
    roleId: targetRoleId,
  });
}

export async function createOrganization(
  systemAdminUserId: string,
  input: CreateOrganizationInput,
) {
  const authorized = await hasPermission(systemAdminUserId, "system.create");

  if (!authorized) {
    return { error: "Unauthorized" };
  }

  const slug = slugify(input.name);

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (existing) {
    return { error: "Organization slug already exists" };
  }

  const [created] = await db
    .insert(organizations)
    .values({
      name: input.name,
      description: input.description,
      slug,
      createdBy: systemAdminUserId,
    })
    .returning();

  revalidatePath("/dashboard/user-management");

  return {
    message: "Organization created successfully",
    organization: created,
  };
}

export async function getUserOrganizations(userId: string) {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      description: organizations.description,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizations.name));

  return rows;
}

export async function getPrimaryOrganizationForUser(userId: string) {
  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizations.name))
    .limit(1);

  return organization;
}

export async function isOrganizationMember(
  userId: string,
  organizationId: string,
) {
  const [membership] = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  return Boolean(membership);
}

export async function assignUserToOrganization(
  systemAdminUserId: string,
  userId: string,
  organizationId: string,
  role: "admin" | "member" = "member",
) {
  const authorized = await hasPermission(systemAdminUserId, "system.create");

  if (!authorized) {
    return { error: "Unauthorized" };
  }

  const result = await db.transaction(async (trx) => {
    const defaultRoleIds = await getDefaultOrganizationRoleIds(trx);

    if ("error" in defaultRoleIds) {
      return defaultRoleIds;
    }

    await trx
      .insert(organizationMembers)
      .values({
        organizationId,
        userId,
        role,
        invitedBy: systemAdminUserId,
      })
      .onConflictDoUpdate({
        target: [
          organizationMembers.organizationId,
          organizationMembers.userId,
        ],
        set: {
          role,
          invitedBy: systemAdminUserId,
        },
      });

    await syncDefaultOrganizationRoleForMember(
      trx,
      organizationId,
      userId,
      role,
      defaultRoleIds,
    );

    return { message: "User assigned to organization successfully" };
  });

  if ("error" in result) {
    return result;
  }

  revalidatePath("/dashboard/user-management");
  revalidatePath("/dashboard/organizations");

  return result;
}

export async function batchAssignUsersToOrganization(
  systemAdminUserId: string,
  organizationId: string,
  userIds: string[],
  role: "admin" | "member" = "member",
) {
  const authorized = await hasPermission(systemAdminUserId, "system.create");

  if (!authorized) {
    return { error: "Unauthorized" };
  }

  const dedupedUserIds = [...new Set(userIds.filter(Boolean))];

  if (dedupedUserIds.length === 0) {
    return { error: "Please select at least one user" };
  }

  const result = await db.transaction(async (trx) => {
    const defaultRoleIds = await getDefaultOrganizationRoleIds(trx);

    if ("error" in defaultRoleIds) {
      return defaultRoleIds;
    }

    for (const userId of dedupedUserIds) {
      await trx
        .insert(organizationMembers)
        .values({
          organizationId,
          userId,
          role,
          invitedBy: systemAdminUserId,
        })
        .onConflictDoUpdate({
          target: [
            organizationMembers.organizationId,
            organizationMembers.userId,
          ],
          set: {
            role,
            invitedBy: systemAdminUserId,
          },
        });

      await syncDefaultOrganizationRoleForMember(
        trx,
        organizationId,
        userId,
        role,
        defaultRoleIds,
      );
    }

    return {
      message: `${dedupedUserIds.length} user(s) assigned to organization successfully`,
    };
  });

  if ("error" in result) {
    return result;
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard/user-management");

  return result;
}

export async function forceUnassignUsersFromOrganization(
  systemAdminUserId: string,
  organizationId: string,
  userIds: string[],
) {
  const authorized = await hasPermission(systemAdminUserId, "system.create");

  if (!authorized) {
    return { error: "Unauthorized" };
  }

  const dedupedUserIds = [...new Set(userIds.filter(Boolean))];

  if (dedupedUserIds.length === 0) {
    return { error: "Please select at least one user" };
  }

  await db.transaction(async (trx) => {
    for (const targetUserId of dedupedUserIds) {
      await trx
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, targetUserId),
          ),
        );

      await trx
        .delete(organizationUserRoles)
        .where(
          and(
            eq(organizationUserRoles.organizationId, organizationId),
            eq(organizationUserRoles.userId, targetUserId),
          ),
        );

      await trx
        .update(agents)
        .set({ organizationId: null, updatedAt: new Date() })
        .where(
          and(
            eq(agents.organizationId, organizationId),
            eq(agents.userId, targetUserId),
          ),
        );

      await trx
        .update(personas)
        .set({ organizationId: null, updatedAt: new Date() })
        .where(
          and(
            eq(personas.organizationId, organizationId),
            eq(personas.userId, targetUserId),
          ),
        );
    }
  });

  revalidatePath("/dashboard/workspace/organization");
  revalidatePath("/dashboard/organizations");

  return {
    message: `${dedupedUserIds.length} user(s) force unassigned from organization successfully`,
  };
}

export async function inviteUserToOrganization(
  organizationAdminUserId: string,
  userId: string,
  organizationId: string,
  role: "admin" | "member" = "member",
) {
  const canManageOrganization = await hasPermission(
    organizationAdminUserId,
    "organization.manage",
  );

  const hasOrganizationScopedAccess = await hasScopedPermission(
    organizationAdminUserId,
    "organization.manage",
    organizationId,
  );

  if (!canManageOrganization && !hasOrganizationScopedAccess) {
    return { error: "Unauthorized" };
  }

  const result = await db.transaction(async (trx) => {
    const defaultRoleIds = await getDefaultOrganizationRoleIds(trx);

    if ("error" in defaultRoleIds) {
      return defaultRoleIds;
    }

    await trx
      .insert(organizationMembers)
      .values({
        organizationId,
        userId,
        role,
        invitedBy: organizationAdminUserId,
      })
      .onConflictDoUpdate({
        target: [
          organizationMembers.organizationId,
          organizationMembers.userId,
        ],
        set: {
          role,
          invitedBy: organizationAdminUserId,
        },
      });

    await syncDefaultOrganizationRoleForMember(
      trx,
      organizationId,
      userId,
      role,
      defaultRoleIds,
    );

    return { message: "User invited to organization successfully" };
  });

  if ("error" in result) {
    return result;
  }

  revalidatePath("/dashboard/workspace/organization");
  revalidatePath("/dashboard/organizations");

  return result;
}

export async function inviteUserToOrganizationByEmail(
  organizationAdminUserId: string,
  email: string,
  organizationId: string,
  role: "admin" | "member" = "member",
) {
  const canManageOrganization = await hasPermission(
    organizationAdminUserId,
    "organization.manage",
  );

  const hasOrganizationScopedAccess = await hasScopedPermission(
    organizationAdminUserId,
    "organization.manage",
    organizationId,
  );

  if (!canManageOrganization && !hasOrganizationScopedAccess) {
    return { error: "Unauthorized" };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [targetUser] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!targetUser) {
    return { error: "User with that email was not found" };
  }

  const result = await db.transaction(async (trx) => {
    const defaultRoleIds = await getDefaultOrganizationRoleIds(trx);

    if ("error" in defaultRoleIds) {
      return defaultRoleIds;
    }

    await trx
      .insert(organizationMembers)
      .values({
        organizationId,
        userId: targetUser.id,
        role,
        invitedBy: organizationAdminUserId,
      })
      .onConflictDoUpdate({
        target: [
          organizationMembers.organizationId,
          organizationMembers.userId,
        ],
        set: {
          role,
          invitedBy: organizationAdminUserId,
        },
      });

    await syncDefaultOrganizationRoleForMember(
      trx,
      organizationId,
      targetUser.id,
      role,
      defaultRoleIds,
    );

    return {
      message: `User ${targetUser.email} invited to organization successfully`,
    };
  });

  if ("error" in result) {
    return result;
  }

  revalidatePath("/dashboard/workspace/organization");
  revalidatePath("/dashboard/organizations");

  return result;
}

export async function assignOrganizationRolesToUser(
  actorUserId: string,
  userId: string,
  organizationId: string,
  roleIds: string[],
) {
  const canManageOrganization = await hasPermission(
    actorUserId,
    "organization.manage",
  );

  const hasOrganizationScopedAccess = await hasScopedPermission(
    actorUserId,
    "organization.manage",
    organizationId,
  );

  if (!canManageOrganization && !hasOrganizationScopedAccess) {
    return { error: "Unauthorized" };
  }

  await db.transaction(async (trx) => {
    await trx
      .delete(organizationUserRoles)
      .where(
        and(
          eq(organizationUserRoles.organizationId, organizationId),
          eq(organizationUserRoles.userId, userId),
        ),
      );

    if (roleIds.length === 0) {
      return;
    }

    await trx.insert(organizationUserRoles).values(
      roleIds.map((roleId) => ({
        organizationId,
        userId,
        roleId,
      })),
    );
  });

  return { message: "Organization roles assigned successfully" };
}

export async function getAllOrganizationsWithMembers(
  requesterUserId: string,
): Promise<OrganizationOverview[] | { error: string }> {
  const authorized = await hasPermission(requesterUserId, "system.read");

  if (!authorized) {
    return { error: "Unauthorized" };
  }

  const organizationsWithMembers = await db.query.organizations.findMany({
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
    orderBy: (organizations, { asc }) => [asc(organizations.name)],
  });

  return organizationsWithMembers.map((organization) => {
    const members: OrganizationMemberInfo[] = organization.members.map(
      (member) => ({
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        email: member.user?.email ?? "Unknown",
        name: member.user?.name ?? null,
      }),
    );

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      createdAt: organization.createdAt,
      memberCount: members.length,
      members,
    };
  });
}

export async function getManagedOrganizationForUser(
  userId: string,
): Promise<OrganizationSummary | null> {
  const memberships = await getUserOrganizations(userId);

  for (const membership of memberships) {
    const canManage = await hasScopedPermission(
      userId,
      "organization.manage",
      membership.id,
    );

    if (canManage) {
      const [organization] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          description: organizations.description,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .where(eq(organizations.id, membership.id))
        .limit(1);

      if (!organization) {
        continue;
      }

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        createdAt: organization.createdAt,
      };
    }
  }

  return null;
}

export async function getOrganizationWorkspaceData(
  actorUserId: string,
  organizationId: string,
): Promise<OrganizationOverview | { error: string }> {
  const canManageOrganization = await hasPermission(
    actorUserId,
    "organization.manage",
  );

  const hasOrganizationScopedAccess = await hasScopedPermission(
    actorUserId,
    "organization.manage",
    organizationId,
  );

  if (!canManageOrganization && !hasOrganizationScopedAccess) {
    return { error: "Unauthorized" };
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!organization) {
    return { error: "Organization not found" };
  }

  const members: OrganizationMemberInfo[] = organization.members.map(
    (member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      email: member.user?.email ?? "Unknown",
      name: member.user?.name ?? null,
    }),
  );

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    createdAt: organization.createdAt,
    memberCount: members.length,
    members,
  };
}

export async function getInvitableUsersForOrganization(
  actorUserId: string,
  organizationId: string,
): Promise<InvitableUser[] | { error: string }> {
  const canManageOrganization = await hasPermission(
    actorUserId,
    "organization.manage",
  );

  const hasOrganizationScopedAccess = await hasScopedPermission(
    actorUserId,
    "organization.manage",
    organizationId,
  );

  if (!canManageOrganization && !hasOrganizationScopedAccess) {
    return { error: "Unauthorized" };
  }

  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));

  const memberIds = new Set(members.map((member) => member.userId));

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .orderBy(asc(users.email));

  return allUsers.filter((user) => !memberIds.has(user.id));
}

export async function updateOrganizationDetails(
  actorUserId: string,
  organizationId: string,
  input: UpdateOrganizationInput,
) {
  const isSystemAdmin = await hasPermission(actorUserId, "system.create");

  const canManageOrganization = await hasPermission(
    actorUserId,
    "organization.manage",
  );

  const hasOrganizationScopedAccess = await hasScopedPermission(
    actorUserId,
    "organization.manage",
    organizationId,
  );

  if (
    !isSystemAdmin &&
    !canManageOrganization &&
    !hasOrganizationScopedAccess
  ) {
    return { error: "Unauthorized" };
  }

  const nextSlug = slugify(input.name);

  const [existingSlug] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.slug, nextSlug),
        ne(organizations.id, organizationId),
      ),
    )
    .limit(1);

  if (existingSlug) {
    return { error: "Organization slug already exists" };
  }

  await db
    .update(organizations)
    .set({
      name: input.name,
      description: input.description,
      slug: nextSlug,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  revalidatePath("/dashboard/workspace/organization");
  revalidatePath("/dashboard/organizations");

  return { message: "Organization updated successfully" };
}

export async function removeUserFromOrganization(
  actorUserId: string,
  targetUserId: string,
  organizationId: string,
) {
  const isSystemAdmin = await hasPermission(actorUserId, "system.create");

  const canManageOrganization = await hasPermission(
    actorUserId,
    "organization.manage",
  );

  const hasOrganizationScopedAccess = await hasScopedPermission(
    actorUserId,
    "organization.manage",
    organizationId,
  );

  if (
    !isSystemAdmin &&
    !canManageOrganization &&
    !hasOrganizationScopedAccess
  ) {
    return { error: "Unauthorized" };
  }

  await db.transaction(async (trx) => {
    await trx
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, targetUserId),
        ),
      );

    await trx
      .delete(organizationUserRoles)
      .where(
        and(
          eq(organizationUserRoles.organizationId, organizationId),
          eq(organizationUserRoles.userId, targetUserId),
        ),
      );

    await trx
      .update(agents)
      .set({ organizationId: null, updatedAt: new Date() })
      .where(
        and(
          eq(agents.organizationId, organizationId),
          eq(agents.userId, targetUserId),
        ),
      );

    await trx
      .update(personas)
      .set({ organizationId: null, updatedAt: new Date() })
      .where(
        and(
          eq(personas.organizationId, organizationId),
          eq(personas.userId, targetUserId),
        ),
      );
  });

  revalidatePath("/dashboard/workspace/organization");
  revalidatePath("/dashboard/organizations");

  return { message: "User removed from organization successfully" };
}
