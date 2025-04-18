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
  DialogTrigger,
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
import { createRoleWithPermissions } from "@/service/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PermissionSelector } from "../permissions/permission-selector";

interface CreateRoleDialogProps {
  userId: string;
  availablePermissions: Permissions[];
}

export function CreateRoleDialog({
  userId,
  availablePermissions,
}: CreateRoleDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionIds: [],
    },
  });

  const onSubmit = (values: RoleFormValues) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: createRoleWithPermissions,
          permission: "system.create",
          userId,
        },
        values,
        values.permissionIds,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      setIsDialogOpen(false);
      form.reset();
      toast.success(res.message);
    });
  };

  // Prevent event bubbling
  const handleStopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={"gradient"}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[500px]"
        onClick={handleStopPropagation}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Define a new role and assign permissions. Click save when
                you&apos;re done.
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
              <Button
                disabled={isPending}
                type="submit"
                onClick={(e) => e.stopPropagation()}
              >
                {isPending ? "Creating Role..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
