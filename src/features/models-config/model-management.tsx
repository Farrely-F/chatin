"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withPermission } from "@/lib/check-permission";
import { ModelSchema } from "@/schema/model-schema";
import {
  ModelDetails,
  addNewModel,
  deleteModel,
  getModelDeleteImpact,
  updateModel,
} from "@/service/model";
import {
  EmbeddingProviderSetting,
  updateEmbeddingModelIdSetting,
  updateEmbeddingProviderSetting,
} from "@/service/system-settings";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ModelForm } from "./model-form";
import { ModelTable } from "./model-table";

// Mock data for demonstration

type ModelManagementProps = Readonly<{
  userId: string;
  models: ModelDetails[];
  embeddingProvider: EmbeddingProviderSetting;
  embeddingModelId: string | null;
}>;

export function ModelManagement({
  userId,
  models,
  embeddingProvider,
  embeddingModelId,
}: ModelManagementProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelDetails | null>(null);
  const [savedEmbeddingProvider, setSavedEmbeddingProvider] =
    useState(embeddingProvider);
  const [selectedEmbeddingProvider, setSelectedEmbeddingProvider] =
    useState(embeddingProvider);
  const [savedEmbeddingModelId, setSavedEmbeddingModelId] = useState<string>(
    embeddingModelId ?? "",
  );
  const [selectedEmbeddingModelId, setSelectedEmbeddingModelId] =
    useState<string>(embeddingModelId ?? "");
  const [isPending, startTransition] = useTransition();

  const embeddingModelsForProvider = models.filter(
    (model) =>
      model.modelType === "embedding" &&
      model.provider === selectedEmbeddingProvider &&
      model.isAvailable,
  );

  const hasEmbeddingModelsForProvider = embeddingModelsForProvider.length > 0;

  const effectiveEmbeddingModelId =
    selectedEmbeddingModelId || embeddingModelsForProvider[0]?.id || "";

  const handleUpdateEmbeddingProvider = () => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: updateEmbeddingProviderSetting,
          permission: "system.create",
          userId,
        },
        selectedEmbeddingProvider,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      const nextModelId =
        embeddingModelsForProvider.find(
          (model) => model.id === selectedEmbeddingModelId,
        )?.id || embeddingModelsForProvider[0]?.id;

      if (nextModelId) {
        const modelRes = await withPermission(
          {
            action: updateEmbeddingModelIdSetting,
            permission: "system.create",
            userId,
          },
          nextModelId,
          selectedEmbeddingProvider,
        );

        if ("error" in modelRes) {
          toast.error(modelRes.error);
          return;
        }

        setSavedEmbeddingModelId(nextModelId);
        setSelectedEmbeddingModelId(nextModelId);
      } else {
        setSavedEmbeddingModelId("");
        setSelectedEmbeddingModelId("");
      }

      setSavedEmbeddingProvider(selectedEmbeddingProvider);
      toast.success("Embedding settings updated successfully");
    });
  };

  const handleUpdateEmbeddingModel = () => {
    if (!effectiveEmbeddingModelId) {
      toast.error("No embedding model available for the selected provider.");
      return;
    }

    startTransition(async () => {
      const res = await withPermission(
        {
          action: updateEmbeddingModelIdSetting,
          permission: "system.create",
          userId,
        },
        effectiveEmbeddingModelId,
        selectedEmbeddingProvider,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      setSavedEmbeddingModelId(effectiveEmbeddingModelId);
      setSelectedEmbeddingModelId(effectiveEmbeddingModelId);
      toast.success("Embedding model updated successfully");
    });
  };

  const handleAddModel = (data: ModelSchema) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: addNewModel,
          permission: "system.create",
          userId,
        },
        data,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      setIsFormOpen(false);
      toast.success("Model added successfully");
    });
  };

  const handleUpdateModel = (updatedModel: ModelSchema) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: updateModel,
          permission: "system.create",
          userId,
        },
        updatedModel.id!,
        updatedModel,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      setEditingModel(null);
      setIsFormOpen(false);
      toast.success("Model updated successfully");
    });
  };

  const handleDeleteModelSafely = (id: string, replacementModelId?: string) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: deleteModel,
          permission: "system.delete",
          userId,
        },
        id,
        replacementModelId,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      toast.success("Model deleted successfully");
    });
  };

  const handleGetDeleteImpact = async (id: string) => {
    return withPermission(
      {
        action: getModelDeleteImpact,
        permission: "system.delete",
        userId,
      },
      id,
    );
  };

  const handleEditModel = (model: ModelDetails) => {
    setEditingModel(model);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="mb-3 space-y-1">
          <h2 className="text-lg font-semibold">Embedding Provider</h2>
          <p className="text-sm text-muted-foreground">
            Global setting for embedding generation used by knowledge base and
            retrieval workflows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedEmbeddingProvider}
            onValueChange={(value) => {
              const provider = value as EmbeddingProviderSetting;
              setSelectedEmbeddingProvider(provider);

              const firstModelForProvider = models.find(
                (model) =>
                  model.modelType === "embedding" &&
                  model.provider === provider &&
                  model.isAvailable,
              );

              if (
                selectedEmbeddingModelId &&
                models.some(
                  (model) =>
                    model.id === selectedEmbeddingModelId &&
                    model.provider === provider &&
                    model.modelType === "embedding" &&
                    model.isAvailable,
                )
              ) {
                return;
              }

              setSelectedEmbeddingModelId(firstModelForProvider?.id ?? "");
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            disabled={
              isPending ||
              (selectedEmbeddingProvider === savedEmbeddingProvider &&
                effectiveEmbeddingModelId === savedEmbeddingModelId)
            }
            onClick={handleUpdateEmbeddingProvider}
          >
            Save Provider + Model
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select
            value={effectiveEmbeddingModelId}
            onValueChange={setSelectedEmbeddingModelId}
            disabled={!hasEmbeddingModelsForProvider}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue
                placeholder={
                  hasEmbeddingModelsForProvider
                    ? "Select embedding model"
                    : "No embedding model available"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {embeddingModelsForProvider.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            disabled={
              isPending ||
              !hasEmbeddingModelsForProvider ||
              !effectiveEmbeddingModelId ||
              (selectedEmbeddingProvider === savedEmbeddingProvider &&
                effectiveEmbeddingModelId === savedEmbeddingModelId)
            }
            onClick={handleUpdateEmbeddingModel}
          >
            Save Model
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap">
        <h2 className="text-xl font-semibold">Available Models</h2>
        <Button
          variant="gradient"
          onClick={() => {
            setEditingModel(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Model
        </Button>
      </div>

      <ModelTable
        isPending={isPending}
        models={models}
        onEdit={handleEditModel}
        onDelete={handleDeleteModelSafely}
        onInspectDelete={handleGetDeleteImpact}
      />

      <ModelForm
        isPending={isPending}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={editingModel ? handleUpdateModel : handleAddModel}
        model={editingModel}
      />
    </div>
  );
}
