import { protectedPage } from "@/lib/check-permission";

export default async function PersonasLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await protectedPage("persona.create");

  return children;
}
