"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import SliderControl from "@/components/ui/slider-control";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import {
  AgentFormInput,
  AgentFormValues,
  agentFormSchema,
} from "@/schema/agent-schema";
import { createNewAgent } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import GroupedModelSelect from "../models-config/model-selector";

export default function AgentCreation({
  models,
}: Readonly<{ models: ModelDetails[] }>) {
  const { data: session } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<AgentFormInput, unknown, AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      modelId: "",
      systemPrompt: "",
      temperature: 0.7,
    },
  });

  const createAgent = (data: AgentFormValues) => {
    startTransition(async () => {
      const res = await createNewAgent(data, session?.user.id || "");

      if (res.error) {
        toast.error(res.error);
      }

      form.reset();
      setIsDialogOpen(false);
      toast.success(res.message);
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={"gradient"} className="w-fit">
          <Plus />
          <span>Create Agent</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg lg:min-w-lg">
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(createAgent)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Personal Assistant Agent" />
                  </FormControl>
                  <div className="text-xs flex items-center gap-1 truncate">
                    your deployed agent slug will be:
                    {field.value && (
                      <Badge variant={"secondary"}>
                        {slugify(field.value)}
                      </Badge>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Personal assistant for daily tasks agent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Available Model</FormLabel>
                  <FormControl>
                    <GroupedModelSelect
                      onValueChange={field.onChange}
                      models={models}
                      filterModelType="language"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="You are daily task assistant agent that are...."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature</FormLabel>
                  <FormControl>
                    <SliderControl
                      defaultValue={[0.7]}
                      value={[field.value]}
                      onChange={(val) => field.onChange(val[0])}
                      minValue={0}
                      maxValue={2}
                      step={0.1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="mt-8" type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
