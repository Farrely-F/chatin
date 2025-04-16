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
import { personaSelection } from "@/constant/persona";
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
