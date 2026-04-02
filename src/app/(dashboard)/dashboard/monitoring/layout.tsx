import { getCurrentUser } from "@/lib/auth/auth";
import { hasScopedPermission } from "@/lib/check-permission";
import { getPrimaryOrganizationForUser } from "@/service/organizations";
import { redirect } from "next/navigation";

export default async function MonitoringLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login");
  }

  const organization = await getPrimaryOrganizationForUser(user.id);
  const authorized = await hasScopedPermission(
    user.id,
    "monitoring.read",
    organization?.id,
  );

  if (!authorized) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
