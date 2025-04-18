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
import { RoleDetails } from "@/service/roles";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { type MouseEvent, useState } from "react";

interface RoleSelectorProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  availableRoles: RoleDetails[];
}

export function RoleSelector({
  selectedRoleIds,
  onChange,
  availableRoles,
}: RoleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Prevent event bubbling
  const handleStopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleSelect = (roleId: string, e?: MouseEvent) => {
    // Prevent the event from bubbling up and closing the dialog
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      onChange([...selectedRoleIds, roleId]);
    }
  };

  const handleSelectAll = (e?: MouseEvent) => {
    // Prevent the event from bubbling up and closing the dialog
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const allRoleIds = availableRoles.map((role) => role.id);
    const allSelected = availableRoles.every((role) =>
      selectedRoleIds.includes(role.id),
    );

    if (allSelected) {
      onChange([]);
    } else {
      onChange(allRoleIds);
    }
  };

  // Filter roles based on search query
  const filteredRoles = availableRoles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description &&
        role.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

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
            {selectedRoleIds.length > 0
              ? `${selectedRoleIds.length} role${selectedRoleIds.length > 1 ? "s" : ""} selected`
              : "Select roles..."}
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
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <CommandList>
              {filteredRoles.length === 0 ? (
                <CommandEmpty>No roles found.</CommandEmpty>
              ) : (
                <ScrollArea className="h-[300px]">
                  <CommandGroup>
                    <div
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => handleSelectAll(e)}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          availableRoles.every((role) =>
                            selectedRoleIds.includes(role.id),
                          )
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50",
                        )}
                      >
                        {availableRoles.every((role) =>
                          selectedRoleIds.includes(role.id),
                        ) && <Check className="h-3 w-3" />}
                      </div>
                      <span className="font-medium">All Roles</span>
                    </div>

                    {filteredRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center gap-2 p-2 pl-8 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => handleSelect(role.id, e)}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedRoleIds.includes(role.id)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50",
                          )}
                        >
                          {selectedRoleIds.includes(role.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span>{role.name}</span>
                          {role.description && (
                            <span className="text-xs text-muted-foreground">
                              {role.description}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CommandGroup>
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

      {selectedRoleIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedRoleIds.map((roleId) => {
            const role = availableRoles.find((r) => r.id === roleId);
            if (!role) return null;

            return (
              <Badge key={roleId} variant="secondary" className="gap-1">
                {role.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(roleId);
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
