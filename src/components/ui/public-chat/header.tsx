import { SidebarTrigger } from "./sidebar";

export async function PageHeader({ title }: { title: string }) {
  return (
    <header className="w-full p-2 flex items-center gap-2 border-b sticky top-0 bg-background rounded-t-2xl min-h-16 z-10">
      <SidebarTrigger isOutsideSidebar className="text-muted-foreground" />
      <h1>{title}</h1>
    </header>
  );
}
