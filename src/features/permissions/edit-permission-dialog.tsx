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
import {
  PermissionFormValues,
  permissionFormSchema,
} from "@/schema/role-schema";
import { Permissions, updatePermission } from "@/service/permissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { MouseEvent, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface EditPermissionDialogProps {
  userId: string;
  permission: Permissions;
}

export function EditPermissionDialog({
  userId,
  permission,
}: Readonly<EditPermissionDialogProps>) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      name: permission.name,
      description: permission.description || "",
      permission: permission.permission,
    },
  });

  const onSubmit = (values: PermissionFormValues) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: updatePermission,
          permission: "system.create",
          userId,
        },
        permission.id,
        values,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      setOpen(false);
      toast.success(res.message);
    });
  };

  const handleStopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 w-full" aria-label="Edit">
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[500px]"
        onClick={handleStopPropagation}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Permission</DialogTitle>
              <DialogDescription>
                Update permission details and code value.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Create Posts" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Value</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. posts.create" {...field} />
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
                        placeholder="Describe what this permission allows..."
                        className="resize-none"
                        {...field}
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
