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
import { truncateCharacters } from "@/lib/utils";
import { ModelDetails } from "@/service/model";
import { useMemo } from "react";

export default function GroupedModelSelect({
  models,
  filterModelType,
  ...props
}: {
  models: ModelDetails[];
  filterModelType?: "language" | "embedding";
} & React.ComponentProps<typeof Select>) {
  const filteredModels = useMemo(() => {
    if (!filterModelType) {
      return models;
    }

    return models.filter((model) => model.modelType === filterModelType);
  }, [filterModelType, models]);

  const groupedModels = useMemo(() => {
    if (!Array.isArray(filteredModels) || filteredModels.length === 0)
      return {};

    return filteredModels.reduce<Record<string, ModelDetails[]>>(
      (acc, model) => {
        if (!model || typeof model !== "object") return acc;

        const rawProvider = model.provider?.trim() || "unknown";
        const normalizedProvider = rawProvider.toLowerCase();

        if (!acc[normalizedProvider]) {
          acc[normalizedProvider] = [];
        }

        acc[normalizedProvider].push(model);
        return acc;
      },
      {},
    );
  }, [filteredModels]);

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
                  {truncateCharacters(model.name, 30)}
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
