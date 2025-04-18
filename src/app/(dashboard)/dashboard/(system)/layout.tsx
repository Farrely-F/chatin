import { getCurrentUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/check-permission";
import { notFound } from "next/navigation";

export default async function SystemAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const isSysAdmin = await hasPermission(user?.id || "", "system.read");

  if (!isSysAdmin) {
    return notFound();
  }

  return <>{children}</>;
}
