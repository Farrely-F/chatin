"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createApiKey } from "@/service/api-key";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from 'zod/v4';

import { ApiKeyDisplay } from "./api-key-display";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  expiresIn: z.string().optional(),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateApiKeyForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      expiresIn: "never",
      scopes: ["chat"],
    },
  });

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      const expiresAt =
        values.expiresIn === "never"
          ? null
          : new Date(
              Date.now() +
                Number.parseInt(values.expiresIn || "") * 24 * 60 * 60 * 1000,
            );
      const result = await createApiKey({
        userId,
        name: values.name,
        scopes: values.scopes,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      });

      if (result.key) {
        setNewApiKey(result.key.key);
        form.reset();
        router.refresh();
        toast.success("API key created successfully");
        return;
      }

      toast.error(result.error || "Failed to create API key");
    });
  }

  const availableScopes = [
    { id: "chat", label: "Chat" },
    { id: "read", label: "Read" },
    { id: "write", label: "Write" },
  ];

  return (
    <div>
      {newApiKey ? (
        <ApiKeyDisplay apiKey={newApiKey} onDone={() => setNewApiKey(null)} />
      ) : (
        <Card className="p-4 h-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Bot API Key" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name to identify this API key
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expiration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      When this API key should expire
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scopes"
                render={() => (
                  <FormItem>
                    <div className="space-y-2">
                      <FormLabel>Scopes</FormLabel>
                      <FormDescription>
                        Select the permissions for this API key
                      </FormDescription>
                    </div>
                    <div className="space-y-2">
                      {availableScopes.map((scope) => (
                        <FormField
                          key={scope.id}
                          control={form.control}
                          name="scopes"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={scope.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(scope.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            scope.id,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== scope.id,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {scope.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                variant={"gradient"}
              >
                {isPending ? "Creating..." : "Create API Key"}
              </Button>
            </form>
          </Form>
        </Card>
      )}
    </div>
  );
}
