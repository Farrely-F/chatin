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
import { createPermission } from "@/service/permissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { type MouseEvent, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function CreatePermissionDialog({ userId }: { userId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [permissionSuggestion, setPermissionSuggestion] = useState("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      permission: "",
    },
  });

  const { name: watchName, permission: watchPermission } = form.watch();
  // Generate a permission suggestion based on the name
  useEffect(() => {
    if (watchName && !watchPermission) {
      const suggestion = watchName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, ".");

      setPermissionSuggestion(suggestion.split(".").reverse().join("."));
    } else {
      setPermissionSuggestion("");
    }
  }, [watchName, watchPermission]);

  const onSubmit = (values: PermissionFormValues) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: createPermission,
          permission: "system.create",
          userId,
        },
        values,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      setIsDialogOpen(false);
      toast.success(res.message);
      form.reset();
    });
  };

  const applySuggestion = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (permissionSuggestion) {
      form.setValue("permission", permissionSuggestion);
    }
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
          Create Permission
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[500px]"
        onClick={handleStopPropagation}
      >
        <DialogHeader>
          <DialogTitle>Create New Permission</DialogTitle>
          <DialogDescription>
            Define a new permission that can be assigned to roles.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="e.g. posts.create" {...field} />
                      </FormControl>
                      {permissionSuggestion && !field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={applySuggestion}
                          className="whitespace-nowrap"
                        >
                          Use Suggestion
                        </Button>
                      )}
                    </div>
                    {permissionSuggestion && !field.value && (
                      <p className="text-xs text-muted-foreground">
                        Suggested:{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">
                          {permissionSuggestion}
                        </code>
                      </p>
                    )}
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
              <Button
                disabled={isPending}
                type="submit"
                onClick={(e) => e.stopPropagation()}
              >
                {isPending ? "Creating..." : "Create Permission"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
