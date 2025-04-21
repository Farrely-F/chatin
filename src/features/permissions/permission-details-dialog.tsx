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
import { Permissions } from "@/service/permissions";
import { format } from "date-fns";

interface PermissionDetailsDialogProps {
  permission: Permissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionDetailsDialog({
  permission,
  open,
  onOpenChange,
}: PermissionDetailsDialogProps) {
  if (!permission) return null;

  const getCategory = (permission: string) => {
    const parts = permission.split(".");
    return parts.length > 1 ? parts[0] : "other";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{permission.name}</DialogTitle>
          <DialogDescription>{permission.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Permission Value</div>
              <div>
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  {permission.permission}
                </code>
              </div>
              <div className="text-muted-foreground">Category</div>
              <div>
                <Badge variant="outline">
                  {getCategory(permission.permission).charAt(0).toUpperCase() +
                    getCategory(permission.permission).slice(1)}
                </Badge>
              </div>
              <div className="text-muted-foreground">Created</div>
              <div>{format(new Date(permission.createdAt || ""), "PPP")}</div>
              <div className="text-muted-foreground">Last Updated</div>
              <div>{format(new Date(permission.updatedAt || ""), "PPP")}</div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Usage Example</h4>
              <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                {`// Check if user has permission
if (userHasPermission("${permission.permission}")) {
  // Allow the action
}`}
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
