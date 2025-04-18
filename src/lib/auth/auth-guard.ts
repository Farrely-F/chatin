import { redirect } from "next/navigation";

import { auth } from "./auth";

export async function requireAuth(redirectTo: string = "/login") {
  const session = await auth();

  if (!session?.user) {
    return redirect(redirectTo);
  }

  return session.user;
}
