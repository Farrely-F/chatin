"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelDetails } from "@/service/model";
import { useMemo } from "react";

export default function GroupedModelSelect({
  models,
  ...props
}: { models: ModelDetails[] } & React.ComponentProps<typeof Select>) {
  const groupedModels = useMemo(() => {
    if (!Array.isArray(models) || models.length === 0) return {};

    return models.reduce<Record<string, ModelDetails[]>>((acc, model) => {
      if (!model || typeof model !== "object") return acc;

      const rawProvider = model.provider?.trim() || "unknown";
      const normalizedProvider = rawProvider.toLowerCase();

      if (!acc[normalizedProvider]) {
        acc[normalizedProvider] = [];
      }

      acc[normalizedProvider].push(model);
      return acc;
    }, {});
  }, [models]);

  const hasGroups = Object.keys(groupedModels).length > 0;

  return (
    <Select {...props}>
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={hasGroups ? "Select a model" : "No models available"}
        />
      </SelectTrigger>
      <SelectContent>
        {hasGroups ? (
          Object.entries(groupedModels).map(([provider, models]) => (
            <SelectGroup key={provider}>
              <SelectLabel className="uppercase font-bold">
                {provider}
              </SelectLabel>
              {models.map((model) => (
                <SelectItem
                  key={model.id}
                  value={model.id}
                  disabled={!model.isAvailable}
                >
                  {model.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          <div className="p-2 text-sm text-muted-foreground">
            No models available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
