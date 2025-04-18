"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Permissions } from "@/service/permissions";
import { format } from "date-fns";
import { Eye, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import DeletePermission from "./delete-permission";
import { PermissionDetailsDialog } from "./permission-details-dialog";

interface PermissionsTableProps {
  permissions: Permissions[];
  categories: string[];
}

export function PermissionsTable({
  permissions,
  categories,
}: PermissionsTableProps) {
  const [selectedPermission, setSelectedPermission] =
    useState<Permissions | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const getCategory = (permission: string) => {
    const parts = permission.split(".");
    return parts?.length > 1 ? parts[0] : "other";
  };

  const filteredPermissions = permissions?.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.permission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (permission.description &&
        permission.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    const permissionCategory = getCategory(permission.permission);
    const matchesCategory = categoryFilter
      ? permissionCategory === categoryFilter
      : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search permissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={categoryFilter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setCategoryFilter(null)}
          >
            All
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant={categoryFilter === category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Permission</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPermissions?.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-8 text-muted-foreground"
              >
                No permissions found
              </TableCell>
            </TableRow>
          ) : (
            filteredPermissions?.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell className="font-medium">{permission.name}</TableCell>
                <TableCell>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                    {permission.permission}
                  </code>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {permission.description}
                </TableCell>
                <TableCell>
                  {format(new Date(permission.createdAt || ""), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setSelectedPermission(permission)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                        <DeletePermission id={permission.id} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <PermissionDetailsDialog
        permission={selectedPermission}
        open={!!selectedPermission}
        onOpenChange={(open) => !open && setSelectedPermission(null)}
      />
    </div>
  );
}
