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
import { ModelDetails } from "@/service/model";
import { Edit, Search, Trash2 } from "lucide-react";
import { useState } from "react";

interface ModelTableProps {
  models: ModelDetails[];
  onEdit: (model: ModelDetails) => void;
  onDelete: (id: string) => void;
}

export function ModelTable({ models, onEdit, onDelete }: ModelTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modelToDelete, setModelToDelete] = useState<ModelDetails | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");

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
                  colSpan={6}
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
                  <TableCell className="hidden md:table-cell max-w-xs truncate">
                    {model.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={model.isAvailable ? "default" : "outline"}>
                      {model.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatDate(model.updatedAt!)}
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
                        onClick={() => setModelToDelete(model)}
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
        onOpenChange={(open) => !open && setModelToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the model. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (modelToDelete) {
                  onDelete(modelToDelete.id!);
                  setModelToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
