"use client";

import { Button } from "@/components/ui/button";
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
import SliderControl from "@/components/ui/slider-control";
import { Textarea } from "@/components/ui/textarea";
import { AgentFormValues, agentFormSchema } from "@/schema/agent-schema";
import { type AgentDetails, updateAgentById } from "@/service/agents";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function EditAgenConfig({
  agentDetails,
  userId,
  callback,
}: {
  agentDetails: AgentDetails;
  userId: string;
  callback?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agentDetails.name,
      description: agentDetails.description || "",
      llmProvider: agentDetails.llmProvider,
      systemPrompt: agentDetails.systemPrompt || "",
      temperature: agentDetails.temperature || 0.7,
      similarityThreshold: agentDetails.similarityThreshold || 0.5,
      topK: agentDetails.topK || 5,
      topP: agentDetails.topP || 1,
    },
  });

  const editAgent = (data: AgentFormValues) => {
    startTransition(async () => {
      const res = await updateAgentById(agentDetails.id, userId, data);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Agent updated successfully");
      callback?.();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(editAgent)} className="space-y-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>Agent Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="llmProvider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LLM Provider</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select LLM Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
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
                  placeholder="Give an additional instruction to the agent, example: always respond in Indonesian language"
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
                  defaultValue={
                    agentDetails.temperature
                      ? [agentDetails.temperature]
                      : [0.7]
                  }
                  value={[field.value]}
                  onChange={(val) => field.onChange(val[0])}
                  minValue={0}
                  maxValue={2}
                  step={0.1}
                />
              </FormControl>
              <FormDescription>
                The higher the value, the more random the response
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="similarityThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Similarity Threshold</FormLabel>
              <FormControl>
                <SliderControl
                  defaultValue={
                    agentDetails.similarityThreshold
                      ? [agentDetails.similarityThreshold]
                      : [0.5]
                  }
                  value={[field.value]}
                  onChange={(val) => field.onChange(val[0])}
                  minValue={0}
                  maxValue={1}
                  step={0.01}
                />
              </FormControl>
              <FormDescription>
                The higher the value, the more similar the chunks need to be to
                be considered similar
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topK"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TopK</FormLabel>
              <FormControl>
                <SliderControl
                  defaultValue={agentDetails.topK ? [agentDetails.topK] : [5]}
                  value={[field.value]}
                  onChange={(val) => field.onChange(val[0])}
                  minValue={0}
                  maxValue={10}
                  step={1}
                />
              </FormControl>
              <FormDescription>
                The ammount of chunks to be search
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topP"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TopP</FormLabel>
              <FormControl>
                <SliderControl
                  defaultValue={agentDetails.topP ? [agentDetails.topP] : [1]}
                  value={[field.value]}
                  onChange={(val) => field.onChange(val[0])}
                  minValue={0.1}
                  maxValue={1}
                  step={0.1}
                />
              </FormControl>
              <FormDescription>
                The higher the value, the more diverse the response. Lower
                values make the model focus on the most probable predictions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="mt-4" type="submit" disabled={isPending}>
          {isPending ? "Editing..." : "Edit"}
        </Button>
      </form>
    </Form>
  );
}
