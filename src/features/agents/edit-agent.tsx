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
import { Separator } from "@/components/ui/separator";
import SliderControl from "@/components/ui/slider-control";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AgentFormValues, agentFormSchema } from "@/schema/agent-schema";
import { type AgentDetails, updateAgentById } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { PersonaDetails } from "@/service/personas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Delete, Speech } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import GroupedModelSelect from "../models-config/model-selector";

export default function EditAgenConfig({
  agentDetails,
  models,
  personas,
  userId,
  callback,
}: {
  agentDetails: AgentDetails;
  models: ModelDetails[];
  personas: PersonaDetails[];
  userId: string;
  callback?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agentDetails.name,
      description: agentDetails.description || "",
      modelId: agentDetails.modelId || "",
      systemPrompt: agentDetails.systemPrompt || "",
      temperature: agentDetails.temperature,
      similarityThreshold: agentDetails.similarityThreshold,
      topK: agentDetails.topK,
      topP: agentDetails.topP,
      personaId: agentDetails.personaId || undefined,
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
      <form
        onSubmit={form.handleSubmit(editAgent)}
        className="space-y-4 @container"
      >
        <FormField
          control={form.control}
          name="personaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>🗣️ Agent Persona</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Select
                    {...field}
                    defaultValue={
                      agentDetails.personaId ? agentDetails?.personaId : ""
                    }
                    onValueChange={field.onChange}
                    disabled={personas.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          personas.length === 0
                            ? "No persona can be found"
                            : "Select Persona to Assign"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {personas?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size={"icon"}
                            type="button"
                            variant={"destructive"}
                            onClick={() => field.onChange("")}
                          >
                            <Delete />
                            <span className="sr-only">Clear</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="dark px-2 py-1 text-xs"
                        >
                          <p>Clear Persona</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size={"icon"}
                            type="button"
                            variant={"outline"}
                            asChild
                          >
                            <Link href={`/dashboard/personas/${field.value}`}>
                              <Speech />
                              <span className="sr-only">Agent Details</span>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="dark px-2 py-1 text-xs"
                        >
                          <p>Persona Details</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-4" />

        <div className="grid @sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>📝 Agent Name</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>🤖 Selected Model</FormLabel>
                <FormControl>
                  <GroupedModelSelect
                    models={models}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>💭 Agent Description</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>🛠️ System Prompt</FormLabel>
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

        <Separator className="my-4" />

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
                The higher the value, the more random the response (might result
                in hallucination)
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
                  value={[field.value!]}
                  onChange={(val) => field.onChange(val[0])}
                  minValue={0}
                  maxValue={1}
                  step={0.01}
                />
              </FormControl>
              <FormDescription>
                Adjusts the minimum relevance score required for retrieved
                documents. Higher values make the search stricter
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
              <FormLabel>Max Context Retrieved</FormLabel>
              <FormControl>
                <SliderControl
                  defaultValue={agentDetails.topK ? [agentDetails.topK] : [5]}
                  value={[field.value!]}
                  onChange={(val) => field.onChange(val[0])}
                  minValue={0}
                  maxValue={10}
                  step={1}
                />
              </FormControl>
              <FormDescription>
                The maximum ammount of retrieved context
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
                  value={[field.value!]}
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
