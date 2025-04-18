"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { withPermission } from "@/lib/check-permission";
import { UserRoleFormValues, userRoleFormSchema } from "@/schema/role-schema";
import { RoleDetails } from "@/service/roles";
import { UserWithRoles, assignRoleToUser } from "@/service/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { type MouseEvent, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { RoleSelector } from "../roles/role-selector";

interface AssignRoleDialogProps {
  userId: string;
  user: UserWithRoles | null;
  roles: RoleDetails[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignRoleDialog({
  userId,
  user,
  roles,
  open,
  onOpenChange,
}: AssignRoleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleFormSchema),
    defaultValues: {
      roleIds: user?.roles?.map((role) => role.id) || [],
    },
  });

  // Update form values when user changes
  if (
    user &&
    open &&
    form.getValues().roleIds.length === 0 &&
    user.roles &&
    user.roles.length > 0
  ) {
    form.setValue(
      "roleIds",
      user.roles.map((role) => role.id),
    );
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  const onSubmit = (values: UserRoleFormValues) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: assignRoleToUser,
          permission: "system.create",
          userId,
        },
        user?.id || "",
        values.roleIds,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      handleOpenChange(false);
      toast.success(res.message);
    });
  };

  // Prevent event bubbling
  const handleStopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onClick={handleStopPropagation}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Assign Roles to User</DialogTitle>
              <DialogDescription>
                Assign roles to {user.name || user.email}. Users inherit all
                permissions from their assigned roles.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles</FormLabel>
                    <FormControl>
                      <RoleSelector
                        selectedRoleIds={field.value}
                        onChange={field.onChange}
                        availableRoles={roles}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenChange(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                disabled={isPending}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
