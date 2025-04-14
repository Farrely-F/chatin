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
import {
  CreatePersonaSchema,
  createPersonaSchema,
} from "@/schema/persona-schema";
import { createAgentPersona } from "@/service/personas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function PersonaCreation({ userId }: { userId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreatePersonaSchema>({
    resolver: zodResolver(createPersonaSchema),
    defaultValues: {
      name: "",
      description: "",
      answerPreference: "moderate",
      defaultLanguage: "english",
      sex: "neutral",
      emojiUsage: "normal",
      formality: "neutral",
    },
  });

  const createPersona = (data: CreatePersonaSchema) => {
    startTransition(async () => {
      const res = await createAgentPersona(userId || "", data);

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
          <span>Create Persona</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg lg:min-w-lg">
        <DialogHeader>
          <DialogTitle>Create Persona</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(createPersona)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona Name</FormLabel>
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
                  <FormLabel>Persona Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {personaSelection.map((selection) => (
              <FormField
                key={selection.id}
                control={form.control}
                name={
                  selection.name as
                    | "name"
                    | "description"
                    | "sex"
                    | "answerPreference"
                    | "formality"
                    | "emojiUsage"
                    | "defaultLanguage"
                }
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selection.label}</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={selection.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {selection.items.map((item) => (
                            <SelectItem key={item.id} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <Button className="mt-8" type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const personaSelection = [
  {
    id: 1,
    name: "sex",
    label: "Agent Sex",
    placeholder: "Select Persona Sex",
    items: [
      {
        id: 1,
        value: "male",
        label: "👨🏿 Male",
      },
      {
        id: 2,
        value: "female",
        label: "👩🏿 Female",
      },
      {
        id: 3,
        value: "neutral",
        label: "🤖 Neutral",
      },
    ],
  },
  {
    id: 2,
    name: "answerPreference",
    label: "Answer Preference",
    placeholder: "Select Answering Preference",
    items: [
      {
        id: 1,
        value: "short",
        label: "Short",
      },
      {
        id: 2,
        value: "moderate",
        label: "Moderate",
      },
      {
        id: 3,
        value: "long",
        label: "Long",
      },
    ],
  },
  {
    id: 3,
    name: "formality",
    label: "Agent Formality",
    placeholder: "Select formality level",
    items: [
      {
        id: 1,
        value: "friendly",
        label: "😁 Friendly",
      },
      {
        id: 2,
        value: "neutral",
        label: "🤖 Neutral",
      },
      {
        id: 3,
        value: "formal",
        label: "💼 Formal",
      },
    ],
  },
  {
    id: 4,
    name: "emojiUsage",
    label: "Emoji Usage",
    placeholder: "Emoji Usage",
    items: [
      {
        id: 1,
        value: "never",
        label: "🚫 Never",
      },
      {
        id: 2,
        value: "normal",
        label: "😃 Normal",
      },
      {
        id: 3,
        value: "frequent",
        label: "✨ Frequent",
      },
    ],
  },
  {
    id: 5,
    name: "defaultLanguage",
    label: "Default Used Language",
    placeholder: "Select Language",
    items: [
      {
        id: 1,
        value: "english",
        label: "English",
      },
      {
        id: 2,
        value: "indonesia",
        label: "Indonesia",
      },
    ],
  },
];
