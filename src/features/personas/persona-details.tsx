"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { PersonaDetails, editAgentPersona } from "@/service/personas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function PersonaDetailsView({
  personaDetails,
  userId,
}: {
  personaDetails: PersonaDetails;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreatePersonaSchema>({
    resolver: zodResolver(createPersonaSchema),
    defaultValues: {
      name: personaDetails.name,
      description: personaDetails.description || "",
      answerPreference: personaDetails.answerPreference!,
      defaultLanguage: personaDetails.defaultLanguage!,
      sex: personaDetails.sex!,
      emojiUsage: personaDetails.emojiUsage!,
      formality: personaDetails.formality!,
    },
  });

  const createPersona = (data: CreatePersonaSchema) => {
    startTransition(async () => {
      const res = await editAgentPersona(personaDetails.id, userId, data);

      if (res.error) {
        toast.error(res.error);
      }

      toast.success(res.message);
    });
  };

  return (
    <div className="w-full gap-2 border rounded-lg min-h-[400px] mt-6 p-2">
      <ScrollArea>
        <div className="w-full h-full p-4">
          <h2 className="mb-4 text-xl">Edit Personas</h2>
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
                {isPending ? "Editing..." : "Edit"}
              </Button>
            </form>
          </Form>
        </div>
      </ScrollArea>
    </div>
  );
}
