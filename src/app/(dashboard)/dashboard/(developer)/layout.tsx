import { protectedPage } from "@/lib/check-permission";

export default async function DeveloperLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await protectedPage("developer.create");

  return children;
}
