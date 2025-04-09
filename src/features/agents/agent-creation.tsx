"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentFormValues, agentFormSchema } from "@/schema/agent-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";

export default function AgentCreation() {
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      llmProvider: "gemini",
      systemPrompt: "",
      temperature: 0.7,
    },
  });

  const handleSubmit = (data: AgentFormValues) => {
    console.log(data);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-fit">
          <Plus />
          <span>Create Agent</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg lg:min-w-lg">
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
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
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select LLM Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="claude">Claude</SelectItem>
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
                    <Input {...field} />
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
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="mt-8" type="submit">
              Submit
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
