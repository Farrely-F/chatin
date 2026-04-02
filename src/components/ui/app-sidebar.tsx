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
import { data } from "@/constant/side-menu";
import { Atom } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const hasPermission = (required?: string, userPermissions: string[] = []) => {
  if (required === "organization.manage") {
    return userPermissions.includes("organization.manage");
  }

  if (userPermissions.includes("system.read")) return true;
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
                  {group.items
                    .filter((item) =>
                      hasPermission(item.permission, permissions),
                    )
                    .map((item) => (
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
          <SidebarGroupContent>
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
