import { getServerSession } from "next-auth/next";

import { authOptions } from "./auth-options";

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type Session = {
  user: AuthUser;
};

export async function auth() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}
