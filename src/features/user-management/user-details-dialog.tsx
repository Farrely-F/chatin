"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserWithRoles } from "@/service/users";
import { format } from "date-fns";

interface UserDetailsDialogProps {
  user: UserWithRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user.name || user.email}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Email</div>
              <div>{user.email}</div>
              <div className="text-muted-foreground">Name</div>
              <div>{user.name || "-"}</div>
              <div className="text-muted-foreground">Auth Provider</div>
              <div>
                <Badge
                  variant={
                    user.authProvider === "google" ? "secondary" : "outline"
                  }
                >
                  {user.authProvider}
                </Badge>
              </div>
              <div className="text-muted-foreground">Created</div>
              <div>{format(new Date(user.createdAt || ""), "PPP")}</div>
              <div className="text-muted-foreground">Last Updated</div>
              {/* <div>{format(new Date(user.updatedAt || ""), "PPP")}</div> */}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Assigned Roles</h4>
              <div className="flex flex-wrap gap-2">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge
                      key={role.id}
                      variant="outline"
                      className="px-3 py-1"
                    >
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No roles assigned
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
