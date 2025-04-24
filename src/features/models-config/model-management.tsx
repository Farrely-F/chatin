"use client";

import { Button } from "@/components/ui/button";
import { withPermission } from "@/lib/check-permission";
import { ModelSchema } from "@/schema/model-schema";
import {
  ModelDetails,
  addNewModel,
  deleteModel,
  updateModel,
} from "@/service/model";
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ModelForm } from "./model-form";
import { ModelTable } from "./model-table";

// Mock data for demonstration

export function ModelManagement({
  userId,
  models,
}: {
  userId: string;
  models: ModelDetails[];
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelDetails | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const handleDeleteModel = (id: string) => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: deleteModel,
          permission: "system.delete",
          userId,
        },
        id,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      toast.success("Model deleted successfully");
    });
  };

  const handleEditModel = (model: ModelDetails) => {
    setEditingModel(model);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
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
        models={models}
        onEdit={handleEditModel}
        onDelete={handleDeleteModel}
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
