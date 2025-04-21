"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Permissions } from "@/service/permissions";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { type MouseEvent, useState } from "react";

interface PermissionSelectorProps {
  selectedPermissionIds: string[];
  onChange: (permissionIds: string[]) => void;
  availablePermissions: Permissions[];
}

export function PermissionSelector({
  selectedPermissionIds,
  onChange,
  availablePermissions,
}: PermissionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Group permissions by category (first part of permission value)
  const groupedPermissions =
    availablePermissions?.reduce(
      (acc, permission) => {
        const category = permission.permission.split(".")[0] || "other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
      },
      {} as Record<string, Permissions[]>,
    ) || {};

  // Sort categories alphabetically
  const sortedCategories = Object?.keys(groupedPermissions).sort();

  // Prevent event bubbling
  const handleStopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleSelect = (permissionId: string, e?: MouseEvent) => {
    // Prevent the event from bubbling up and closing the dialog
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (selectedPermissionIds.includes(permissionId)) {
      onChange(selectedPermissionIds.filter((id) => id !== permissionId));
    } else {
      onChange([...selectedPermissionIds, permissionId]);
    }
  };

  const handleSelectAll = (
    categoryPermissions: Permissions[],
    e?: MouseEvent,
  ) => {
    // Prevent the event from bubbling up and closing the dialog
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const categoryPermissionIds = categoryPermissions.map((p) => p.id);
    const allSelected = categoryPermissions.every((p) =>
      selectedPermissionIds.includes(p.id),
    );

    if (allSelected) {
      // Remove all permissions from this category
      onChange(
        selectedPermissionIds.filter(
          (id) => !categoryPermissionIds.includes(id),
        ),
      );
    } else {
      // Add all permissions from this category that aren't already selected
      const newPermissionIds = [...selectedPermissionIds];
      categoryPermissionIds.forEach((id) => {
        if (!newPermissionIds.includes(id)) {
          newPermissionIds.push(id);
        }
      });
      onChange(newPermissionIds);
    }
  };

  // Filter permissions based on search query
  const filteredCategories = searchQuery
    ? sortedCategories.filter((category) =>
        groupedPermissions[category].some(
          (permission) =>
            permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            permission.permission
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            (permission.description &&
              permission.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase())),
        ),
      )
    : sortedCategories;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedPermissionIds.length > 0
              ? `${selectedPermissionIds.length} permission${selectedPermissionIds.length > 1 ? "s" : ""} selected`
              : "Select permissions..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0"
          onClick={handleStopPropagation}
        >
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <CommandList>
              {filteredCategories?.length === 0 ? (
                <CommandEmpty>No permissions found.</CommandEmpty>
              ) : (
                <ScrollArea className="h-[300px]">
                  {filteredCategories?.map((category) => {
                    const categoryPermissions = groupedPermissions[
                      category
                    ].filter(
                      (permission) =>
                        !searchQuery ||
                        permission.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        permission.permission
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        (permission.description &&
                          permission.description
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())),
                    );

                    if (categoryPermissions.length === 0) return null;

                    return (
                      <CommandGroup
                        key={category}
                        heading={
                          category.charAt(0).toUpperCase() + category.slice(1)
                        }
                      >
                        <div
                          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectAll(categoryPermissions, e);
                          }}
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              categoryPermissions.every((p) =>
                                selectedPermissionIds.includes(p.id),
                              )
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50",
                            )}
                          >
                            {categoryPermissions.every((p) =>
                              selectedPermissionIds.includes(p.id),
                            ) && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-medium">
                            All{" "}
                            {category.charAt(0).toUpperCase() +
                              category.slice(1)}{" "}
                            Permissions
                          </span>
                        </div>

                        {categoryPermissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center gap-2 p-2 pl-8 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSelect(permission.id, e);
                            }}
                          >
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                selectedPermissionIds.includes(permission.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50",
                              )}
                            >
                              {selectedPermissionIds.includes(
                                permission.id,
                              ) && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex flex-col">
                              <span>{permission.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {permission.permission}
                              </span>
                            </div>
                          </div>
                        ))}
                      </CommandGroup>
                    );
                  })}
                </ScrollArea>
              )}
            </CommandList>
            <CommandSeparator />
            <div className="p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Apply
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedPermissionIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedPermissionIds.map((permissionId) => {
            const permission = availablePermissions.find(
              (p) => p.id === permissionId,
            );
            if (!permission) return null;

            return (
              <Badge key={permissionId} variant="secondary" className="gap-1">
                {permission.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(permissionId);
                  }}
                >
                  <span className="sr-only">Remove</span>
                  <span className="text-xs">×</span>
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
