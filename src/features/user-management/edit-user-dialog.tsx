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
import { Input } from "@/components/ui/input";
import { withPermission } from "@/lib/check-permission";
import { UserWithRoles, updateUser } from "@/service/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { type MouseEvent, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

const editUserSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string().trim().min(1, "Name is required"),
});

type EditUserSchema = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  userId: string;
  user: UserWithRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({
  userId,
  user,
  open,
  onOpenChange,
}: Readonly<EditUserDialogProps>) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditUserSchema>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        email: user.email,
        name: user.name || "",
      });
    }
  }, [form, open, user]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }

    onOpenChange(nextOpen);
  };

  const onSubmit = (values: EditUserSchema) => {
    if (!user) return;

    startTransition(async () => {
      const res = await withPermission(
        {
          action: updateUser,
          permission: "system.create",
          userId,
        },
        user.id,
        values,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      handleOpenChange(false);
      toast.success(res.message);
    });
  };

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
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update profile information for {user.name || user.email}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
