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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ModelSchema,
  ModelSchemaInput,
  modelSchema,
} from "@/schema/model-schema";
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
}: Readonly<ModelFormProps>) {
  const form = useForm<ModelSchemaInput, unknown, ModelSchema>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: "",
      provider: "",
      modelType: "language",
      description: "",
      isAvailable: false,
      supportsImageInput: false,
      supportsCustomDimensions: false,
      supportsMultimodal: false,
      supportsToolUse: false,
      supportsToolStreaming: false,
      supportsObjectGeneration: false,
      inputCostPer1mTokens: 0,
      outputCostPer1mTokens: 0,
    },
  });

  useEffect(() => {
    if (open && model) {
      form.reset({
        id: model.id,
        name: model.name,
        provider: model.provider,
        modelType: model.modelType,
        description: model.description || "",
        isAvailable: model.isAvailable || false,
        supportsImageInput: model.supportsImageInput,
        supportsCustomDimensions: model.supportsCustomDimensions,
        supportsMultimodal: model.supportsMultimodal,
        supportsToolUse: model.supportsToolUse,
        supportsToolStreaming: model.supportsToolStreaming,
        supportsObjectGeneration: model.supportsObjectGeneration,
        inputCostPer1mTokens: Number(model.inputCostPer1mTokens ?? 0),
        outputCostPer1mTokens: Number(model.outputCostPer1mTokens ?? 0),
      });
    } else if (open && !model) {
      form.reset({
        name: "",
        provider: "",
        modelType: "language",
        description: "",
        isAvailable: true,
        supportsImageInput: false,
        supportsCustomDimensions: false,
        supportsMultimodal: false,
        supportsToolUse: false,
        supportsToolStreaming: false,
        supportsObjectGeneration: false,
        inputCostPer1mTokens: 0,
        outputCostPer1mTokens: 0,
      });
    }
  }, [open, model, form]);

  const handleSubmit = (values: ModelSchema) => {
    onSubmit({
      id: values.id || crypto.randomUUID(),
      name: values.name,
      provider: values.provider,
      modelType: values.modelType,
      description: values.description || "",
      isAvailable: values.isAvailable,
      supportsImageInput:
        values.modelType === "language" ? values.supportsImageInput : false,
      supportsCustomDimensions:
        values.modelType === "embedding"
          ? values.supportsCustomDimensions
          : false,
      supportsMultimodal: values.supportsMultimodal,
      supportsToolUse:
        values.modelType === "language" ? values.supportsToolUse : false,
      supportsToolStreaming:
        values.modelType === "language" ? values.supportsToolStreaming : false,
      supportsObjectGeneration:
        values.modelType === "language"
          ? values.supportsObjectGeneration
          : false,
      inputCostPer1mTokens: values.inputCostPer1mTokens,
      outputCostPer1mTokens: values.outputCostPer1mTokens,
    });
  };

  const getNumberInputValue = (value: unknown): string | number => {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string" || typeof value === "number") {
      return value;
    }

    return "";
  };

  const modelType = form.watch("modelType");

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
              name="modelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Type</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as "language" | "embedding")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="language">Language</SelectItem>
                        <SelectItem value="embedding">Embedding</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Classify whether this model is used for text generation or
                    vector embeddings.
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="inputCostPer1mTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input Cost / 1M Tokens (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.000001"
                        placeholder="3"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={getNumberInputValue(field.value)}
                        onChange={(event) => {
                          field.onChange(event.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Charged by provider for 1M input tokens on this model.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputCostPer1mTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output Cost / 1M Tokens (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.000001"
                        placeholder="15"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={getNumberInputValue(field.value)}
                        onChange={(event) => {
                          field.onChange(event.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Charged by provider for 1M output tokens on this model.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {modelType === "embedding" ? (
              <>
                <FormField
                  control={form.control}
                  name="supportsMultimodal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Supports Multimodal
                        </FormLabel>
                        <FormDescription>
                          Indicates this model can process multiple data
                          modalities (for example text and image input).
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
                  name="supportsCustomDimensions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Supports Custom Dimensions
                        </FormLabel>
                        <FormDescription>
                          Enable if this embedding model allows custom output
                          dimensionality.
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
              </>
            ) : null}

            {modelType === "language" ? (
              <>
                <FormField
                  control={form.control}
                  name="supportsImageInput"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Support Image Input
                        </FormLabel>
                        <FormDescription>
                          Support image input for this model
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={modelType !== "language"}
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
                        <FormDescription>
                          Support tool use for this model
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
                  name="supportsToolStreaming"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Support Tool Streaming
                        </FormLabel>
                        <FormDescription>
                          Support tool streaming for this model
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
                  name="supportsObjectGeneration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Support Object Generation
                        </FormLabel>
                        <FormDescription>
                          Support object generation for this model
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
              </>
            ) : null}

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
