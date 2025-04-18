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
import InputPassword from "@/components/ui/input-password";
import { RegisterSchema, registerSchema } from "@/schema/user-auth-schema";
import { createUser } from "@/service/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { type MouseEvent, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function CreateUserDialog({ userId }: { userId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = (values: RegisterSchema) => {
    startTransition(async () => {
      const res = await createUser(userId, values);

      if (res.error) {
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
          Create User
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[500px]"
        onClick={handleStopPropagation}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="user@example.com"
                        type="email"
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
                      <Input
                        placeholder="John Doe"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <InputPassword
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <InputPassword
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
