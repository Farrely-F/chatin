// lib/auth/drizzleAdapter.ts
import { db } from "@/db";
import { roles, userRoles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  Adapter,
  AdapterAccount,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";

export function DrizzleAdapter(): Adapter {
  return {
    async getUser(id: string): Promise<AdapterUser | null> {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      return user ? { ...user, emailVerified: null } : null;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      return user ? { ...user, emailVerified: null } : null;
    },

    async createUser(data: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const [user] = await db
        .insert(users)
        .values({
          email: data.email,
          name: data.name,
          authProvider: "google",
        })
        .returning();

      const role = await db.select().from(roles).where(eq(roles.name, "Users"));

      if (role.length > 0) {
        await db.insert(userRoles).values({
          userId: user.id,
          roleId: role[0].id,
        });
      }

      return { ...user, emailVerified: null };
    },

    async updateUser(
      user: Partial<AdapterUser> & { id: string },
    ): Promise<AdapterUser> {
      const [updatedUser] = await db
        .update(users)
        .set({
          name: user.name ?? undefined,
          email: user.email ?? undefined,
        })
        .where(eq(users.id, user.id))
        .returning();

      return { ...updatedUser, emailVerified: null };
    },

    async deleteUser(userId: string): Promise<void> {
      await db.delete(users).where(eq(users.id, userId));
    },

    // These can return null or empty since you're not using OAuth or sessions
    async getUserByAccount(
      providerAccountId: Pick<AdapterAccount, "provider" | "providerAccountId">,
    ): Promise<AdapterUser | null> {
      // you likely don't have an "accounts" table implemented,
      // so just return null to avoid the adapter error
      return null;
    },

    async linkAccount(_account: AdapterAccount): Promise<void> {
      return;
    },

    async unlinkAccount(_params: {
      provider: string;
      providerAccountId: string;
    }): Promise<void> {
      return;
    },

    createSession: async () => {
      // not used with JWT strategy
      throw new Error("createSession is not implemented because JWT is used.");
    },
    getSessionAndUser: async () => {
      // not used with JWT strategy
      return null;
    },
    updateSession: async () => {
      // not used with JWT strategy
      throw new Error("updateSession is not implemented because JWT is used.");
    },
    deleteSession: async () => {
      // not used with JWT strategy
      throw new Error("deleteSession is not implemented because JWT is used.");
    },

    async createVerificationToken(): Promise<VerificationToken | null> {
      return null;
    },

    async useVerificationToken(): Promise<VerificationToken | null> {
      return null;
    },
  };
}
