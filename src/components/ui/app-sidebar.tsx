"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { url } from "inspector";
import {
  Atom,
  BookText,
  Bot,
  Code2Icon,
  Home,
  KeyIcon,
  MessageCircleMore,
  SendIcon,
  UserCircle,
  UserPen,
  Wrench,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const data = {
  navMain: [
    {
      title: "Navigation",
      url: "#",
      disabled: false,
      items: [
        {
          title: "Home",
          url: "/dashboard",
          icon: Home,
          disabled: false,
        },
        {
          title: "Agents",
          url: "/dashboard/agents",
          icon: Bot,
          disabled: false,
        },
        {
          title: "Personas",
          url: "/dashboard/personas",
          icon: UserPen,
          disabled: false,
        },
      ],
    },
    {
      title: "System",
      url: "#",
      disabled: false,
      permission: "system.read",
      items: [
        {
          title: "User Management",
          url: "/dashboard/user-management",
          icon: UserCircle,
          disabled: false,
        },
        {
          title: "Permission",
          url: "/dashboard/roles-and-permissions",
          icon: KeyIcon,
          disabled: false,
        },
        {
          title: "Model Management",
          url: "/dashboard/model-management",
          icon: Wrench,
          disabled: false,
        },
      ],
    },
    {
      title: "Integration",
      url: "#",
      disabled: true,
      items: [
        {
          title: "Telegram",
          url: "",
          icon: SendIcon,
          disabled: true,
        },
        {
          title: "WhatsApp",
          url: "",
          icon: MessageCircleMore,
          disabled: true,
        },
        {
          title: "Widget",
          url: "",
          icon: MessageCircleMore,
          disabled: true,
        },
      ],
    },
    {
      title: "Developer",
      url: "#",
      disabled: true,
      items: [
        {
          title: "API",
          url: "",
          icon: Code2Icon,
          disabled: true,
        },
        {
          title: "Documentation",
          url: "",
          icon: BookText,
          disabled: true,
        },
      ],
    },
  ],
  footerAction: [
    {
      title: "Logout",
      url: "",
      icon: Home,
    },
  ],
};

const hasPermission = (required?: string, userPermissions: string[] = []) => {
  if (!required) return true;
  return userPermissions.includes(required);
};

export function AppSidebar({
  permissions,
  ...props
}: { permissions: string[] } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props} className="dark !border-none">
      <SidebarHeader>
        <div className="p-2 flex items-center gap-2">
          <Atom className="text-primary" size={22} aria-hidden="true" />
          <h2>ChatIn</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain
          .filter((group) => hasPermission(group.permission, permissions))
          .map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="uppercase text-sidebar-foreground/50">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className="group/menu-button font-medium gap-3 h-9 rounded-md [&>svg]:size-auto"
                        isActive={item.url === pathname}
                        disabled={item.disabled}
                      >
                        <Link
                          href={item.url}
                          className={item.disabled ? "opacity-20" : ""}
                        >
                          {item.icon && (
                            <item.icon
                              className="text-sidebar-foreground/50 group-data-[active=true]/menu-button:text-primary"
                              size={18}
                              aria-hidden="true"
                            />
                          )}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {data.footerAction.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="group/menu-button font-medium gap-3 h-9 rounded-md [&>svg]:size-auto"
                  >
                    <button onClick={() => signOut()}>
                      {item.icon && (
                        <item.icon
                          className="text-sidebar-foreground/50 group-data-[active=true]/menu-button:text-primary"
                          size={18}
                          aria-hidden="true"
                        />
                      )}
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
