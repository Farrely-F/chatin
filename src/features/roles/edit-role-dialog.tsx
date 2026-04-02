"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { withPermission } from "@/lib/check-permission";
import { RoleFormValues, roleFormSchema } from "@/schema/role-schema";
import { Permissions } from "@/service/permissions";
import {
  RoleWithPermissions,
  updateRoleWithPermissions,
} from "@/service/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { MouseEvent, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PermissionSelector } from "../permissions/permission-selector";

interface EditRoleDialogProps {
  userId: string;
  role: RoleWithPermissions;
  availablePermissions: Permissions[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRoleDialog({
  userId,
  role,
  availablePermissions,
  open,
  onOpenChange,
}: Readonly<EditRoleDialogProps>) {
  const [isPending, startTransition] = useTransition();

  const defaultPermissionIds = useMemo(
    () => role.permissions?.map((permission) => permission.id) || [],
    [role.permissions],
  );

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role.name,
      description: role.description || "",
      permissionIds: defaultPermissionIds,
    },
  });

  const onSubmit = (values: RoleFormValues) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: updateRoleWithPermissions,
          permission: "system.create",
          userId,
        },
        role.id,
        values,
        values.permissionIds,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      onOpenChange(false);
      toast.success(res.message);
    });
  };

  const handleStopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onClick={handleStopPropagation}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update role details and assigned permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Content Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this role is for..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissionIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <FormControl>
                      <PermissionSelector
                        selectedPermissionIds={field.value}
                        onChange={field.onChange}
                        availablePermissions={availablePermissions}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
