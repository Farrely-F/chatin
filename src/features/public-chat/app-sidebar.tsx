import { Atom } from "lucide-react";
import Link from "next/link";

import ChatHistory from "./chat-history";
import NewChatPage from "./new-chat";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from "./sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      variant="inset"
      {...props}
      className="dark scheme-only-dark max-lg:p-3 lg:pe-1"
    >
      <SidebarHeader>
        <div className="flex justify-between items-center gap-2">
          <div className="p-2 flex items-center gap-2">
            <Link href={"/"} className="contents">
              <Atom className="text-primary" size={22} aria-hidden="true" />
              <h2>ChatIn</h2>
            </Link>
          </div>
          <SidebarTrigger className="text-muted-foreground/80 hover:text-foreground/80 hover:bg-transparent!" />
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 mt-3 pt-3 border-t">
        <SidebarGroup className="px-1 z-20 bg-sidebar sticky -top-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <NewChatPage />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="uppercase text-muted-foreground/65 bg-background z-10">
            History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ChatHistory />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
