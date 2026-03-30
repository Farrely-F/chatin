"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModelDeleteImpact, ModelDetails } from "@/service/model";
import { Edit, Loader2, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ModelTableProps {
  isPending: boolean;
  models: ModelDetails[];
  onEdit: (model: ModelDetails) => void;
  onDelete: (id: string, replacementModelId?: string) => void;
  onInspectDelete: (
    id: string,
  ) => Promise<ModelDeleteImpact | { error: string }>;
}

export function ModelTable({
  isPending,
  models,
  onEdit,
  onDelete,
  onInspectDelete,
}: Readonly<ModelTableProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modelToDelete, setModelToDelete] = useState<ModelDetails | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<ModelDeleteImpact | null>(
    null,
  );
  const [isInspectingDelete, setIsInspectingDelete] = useState(false);
  const [replacementModelId, setReplacementModelId] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");

  const closeDeleteDialog = () => {
    setModelToDelete(null);
    setDeleteImpact(null);
    setReplacementModelId("");
    setIsInspectingDelete(false);
  };

  const openDeleteDialog = async (model: ModelDetails) => {
    setModelToDelete(model);
    setDeleteImpact(null);
    setReplacementModelId("");
    setIsInspectingDelete(true);

    try {
      const impact = await onInspectDelete(model.id);

      if ("error" in impact) {
        toast.error(impact.error);
        closeDeleteDialog();
        return;
      }

      setDeleteImpact(impact);
    } catch {
      toast.error("Cannot process your request");
      closeDeleteDialog();
    } finally {
      setIsInspectingDelete(false);
    }
  };

  const connectedAgents = deleteImpact?.connectedAgents || [];
  const replacementModels = deleteImpact?.replacementModels || [];
  const requiresReplacement = connectedAgents.length > 0;
  const canDelete =
    !!modelToDelete &&
    !isPending &&
    !isInspectingDelete &&
    (!requiresReplacement || !!replacementModelId);

  // Get unique providers from models
  const uniqueProviders = Array.from(
    new Set(models.map((model) => model.provider)),
  );

  // Apply all filters
  const filteredModels = models.filter((model) => {
    // Text search filter
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Provider filter
    const matchesProvider =
      selectedProviders.length === 0 ||
      selectedProviders.includes(model.provider) ||
      selectedProviders.includes("all");

    // Availability filter
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && model.isAvailable) ||
      (availabilityFilter === "unavailable" && !model.isAvailable);

    return matchesSearch && matchesProvider && matchesAvailability;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatUsd = (value: string | number | null | undefined) => {
    const parsed = Number(value ?? 0);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select
            onValueChange={(provider) => setSelectedProviders([provider])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Providers</SelectLabel>
                <SelectItem value="all">All</SelectItem>
                {uniqueProviders.map((provider) => (
                  <SelectItem
                    key={provider}
                    value={provider}
                    className="capitalize"
                  >
                    {provider}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(availability) =>
              setAvailabilityFilter(
                availability as "all" | "available" | "unavailable",
              )
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Availabilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Availabilities</SelectLabel>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg @container">
        <Table className="w-full @sm:w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="hidden lg:table-cell">
                Input / 1M (USD)
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                Output / 1M (USD)
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Description
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">
                Last Updated
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModels.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-6 text-muted-foreground"
                >
                  No models found
                </TableCell>
              </TableRow>
            ) : (
              filteredModels.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell className="capitalize">{model.provider}</TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs">
                    {formatUsd(model.inputCostPer1mTokens)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs">
                    {formatUsd(model.outputCostPer1mTokens)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate">
                    {model.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={model.isAvailable ? "default" : "outline"}>
                      {model.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatDate(model.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(model)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          void openDeleteDialog(model);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!modelToDelete}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the model and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isInspectingDelete ? (
            <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connected agents...
            </div>
          ) : null}

          {!isInspectingDelete && requiresReplacement ? (
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">Connected agents</p>
                <p className="text-sm text-muted-foreground">
                  Reassign these agents to another available model before
                  deleting.
                </p>
                <ScrollArea className="mt-3 h-36 pr-2">
                  <div className="flex flex-col gap-2">
                    {connectedAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between rounded-md border p-2"
                      >
                        <span className="text-sm font-medium">
                          {agent.name}
                        </span>
                        <Badge variant="outline">/{agent.slug}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {replacementModels.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Replacement model</p>
                  <Select
                    value={replacementModelId}
                    onValueChange={setReplacementModelId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a replacement model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Models</SelectLabel>
                        {replacementModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm text-destructive">
                  No replacement model is available. Add a new model first.
                </p>
              )}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();

                if (!modelToDelete) {
                  return;
                }

                if (requiresReplacement && !replacementModelId) {
                  toast.error("Please select a replacement model.");
                  return;
                }

                onDelete(modelToDelete.id, replacementModelId || undefined);
                closeDeleteDialog();
              }}
              disabled={!canDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
