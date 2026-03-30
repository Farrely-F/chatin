import { protectedPage } from "@/lib/check-permission";

export default async function MonitoringLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await protectedPage("system.read");

  return <>{children}</>;
}
