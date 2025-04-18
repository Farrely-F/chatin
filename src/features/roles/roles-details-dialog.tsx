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
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleWithPermissions } from "@/service/roles";
import { format } from "date-fns";

interface RoleDetailsDialogProps {
  role: RoleWithPermissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleDetailsDialog({
  role,
  open,
  onOpenChange,
}: RoleDetailsDialogProps) {
  if (!role) return null;

  // Group permissions by category
  const groupedPermissions =
    role.permissions?.reduce(
      (acc, permission) => {
        const category = permission.permission?.split(".")[0] || "other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
      },
      {} as Record<string, typeof role.permissions>,
    ) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{role.name}</DialogTitle>
          <DialogDescription>{role.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Role Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Created</div>
                <div>{format(new Date(role.createdAt || ""), "PPP")}</div>
                <div className="text-muted-foreground">Last Updated</div>
                <div>{format(new Date(role.updatedAt || ""), "PPP")}</div>
                <div className="text-muted-foreground">Permissions</div>
                <div>{role.permissions?.length || 0}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Permissions</h4>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="space-y-4">
                  {/* Group permissions by category */}
                  {Object.entries(groupedPermissions).map(
                    ([category, permissions]) => (
                      <div key={category}>
                        <h5 className="text-sm font-medium capitalize mb-2">
                          {category}
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {permissions?.map((permission) => (
                            <Badge
                              key={permission.id}
                              variant="outline"
                              className="flex gap-2 items-center"
                            >
                              <span>{permission.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({permission.permission})
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </ScrollArea>
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
