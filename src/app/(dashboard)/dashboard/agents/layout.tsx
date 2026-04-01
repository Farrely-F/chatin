import { protectedPage } from "@/lib/check-permission";

export default async function AgentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await protectedPage("agent.read");

  return children;
}
