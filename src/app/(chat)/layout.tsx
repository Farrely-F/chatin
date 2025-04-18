import { AppSidebar } from "@/components/ui/public-chat/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/public-chat/sidebar";

export default function PublicChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-2 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
