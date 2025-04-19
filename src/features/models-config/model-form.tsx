"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ModelSchema, modelSchema } from "@/schema/model-schema";
import { ModelDetails } from "@/service/model";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

interface ModelFormProps {
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ModelSchema) => void;
  model: ModelDetails | null;
}

export function ModelForm({
  isPending,
  open,
  onOpenChange,
  onSubmit,
  model,
}: ModelFormProps) {
  const form = useForm<ModelSchema>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: "",
      provider: "",
      description: "",
      isAvailable: false,
      supportsImageInput: false,
      supportsToolUse: false,
      supportsToolStreaming: false,
      supportsObjectGeneration: false,
    },
  });

  useEffect(() => {
    if (open && model) {
      form.reset({
        id: model.id,
        name: model.name,
        provider: model.provider,
        description: model.description || "",
        isAvailable: model.isAvailable || false,
        supportsImageInput: model.supportsImageInput,
        supportsToolUse: model.supportsToolUse,
        supportsToolStreaming: model.supportsToolStreaming,
        supportsObjectGeneration: model.supportsObjectGeneration,
      });
    } else if (open && !model) {
      form.reset({
        name: "",
        provider: "",
        description: "",
        isAvailable: true,
        supportsImageInput: false,
        supportsToolUse: false,
        supportsToolStreaming: false,
        supportsObjectGeneration: false,
      });
    }
  }, [open, model, form]);

  const handleSubmit = (values: ModelSchema) => {
    onSubmit({
      id: values.id || crypto.randomUUID(),
      name: values.name,
      provider: values.provider,
      description: values.description || "",
      isAvailable: values.isAvailable,
      supportsImageInput: values.supportsImageInput,
      supportsToolUse: values.supportsToolUse,
      supportsToolStreaming: values.supportsToolStreaming,
      supportsObjectGeneration: values.supportsObjectGeneration,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{model ? "Edit Model" : "Add New Model"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="gpt-4-turbo" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of the AI model (e.g., gpt-4-turbo, claude-3-opus)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <Input placeholder="openai" {...field} />
                  </FormControl>
                  <FormDescription>
                    The provider of the AI model (e.g., openai, anthropic)
                  </FormDescription>
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
                      placeholder="A brief description of the model's capabilities"
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
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Availability</FormLabel>
                    <FormDescription>
                      Make this model available for use in the platform
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportsImageInput"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Support Image Input
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportsToolUse"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Support Tool Use
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportsToolStreaming"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Support Tool Streaming
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportsObjectGeneration"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Support Object Generation
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {model ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
