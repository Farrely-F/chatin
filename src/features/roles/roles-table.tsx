"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleWithPermissions } from "@/service/roles";
import { format } from "date-fns";
import { Eye, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import DeleteRole from "./delete-role";
import { RoleDetailsDialog } from "./roles-details-dialog";

interface RolesTableProps {
  roles: RoleWithPermissions[];
}

export function RolesTable({ roles }: RolesTableProps) {
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(
    null,
  );

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell>{role.description}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {role.permissions && role.permissions.length > 3 ? (
                    <>
                      {role.permissions.slice(0, 2).map((permission) => (
                        <Badge key={permission.id} variant="outline">
                          {permission.name}
                        </Badge>
                      ))}
                      <Badge variant="outline">
                        +{role.permissions.length - 2} more
                      </Badge>
                    </>
                  ) : (
                    role.permissions?.map((permission) => (
                      <Badge key={permission.id} variant="outline">
                        {permission.name}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(role.createdAt || ""), "MMM d, yyyy")}
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
                    <DropdownMenuItem onClick={() => setSelectedRole(role)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => e.preventDefault()}
                    >
                      <DeleteRole id={role.id} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RoleDetailsDialog
        role={selectedRole}
        open={!!selectedRole}
        onOpenChange={(open) => !open && setSelectedRole(null)}
      />
    </div>
  );
}
