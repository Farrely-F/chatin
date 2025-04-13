"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function UserDropdown() {
  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-5 p-0 hover:bg-transparent">
          <User
            size={20}
            className="text-muted-foreground/70"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64 p-2" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col py-0 px-1 mb-2">
          <span className="truncate text-sm font-medium text-foreground mb-0.5">
            {session?.user.name}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {session?.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 px-2" asChild>
          <button
            onClick={() => signOut()}
            className="text-xs text-foreground hover:bg-transparent w-full justify-start"
          >
            <LogOut size={16} className="text-muted-foreground" />
            Log out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
