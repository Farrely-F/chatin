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
  Select,
  SelectContent,
  SelectItem,
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
import { RoleDetails } from "@/service/roles";
import { UserWithRoles } from "@/service/users";
import { format } from "date-fns";
import { Eye, KeyRound, MoreHorizontal, Pencil, UserCog } from "lucide-react";
import { useState } from "react";

import { AssignRoleDialog } from "./assign-role-dialog";
import { ChangePasswordDialog } from "./change-password-dialog";
import DeleteUser from "./delete-user";
import { EditUserDialog } from "./edit-user-dialog";
import { UserDetailsDialog } from "./user-details-dialog";

interface UsersTableProps {
  userId: string;
  users: UserWithRoles[];
  roles: RoleDetails[];
}

export function UsersTable({
  userId,
  users,
  roles,
}: Readonly<UsersTableProps>) {
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [userForRoleAssignment, setUserForRoleAssignment] =
    useState<UserWithRoles | null>(null);
  const [userForEdit, setUserForEdit] = useState<UserWithRoles | null>(null);
  const [userForPasswordUpdate, setUserForPasswordUpdate] =
    useState<UserWithRoles | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [authProviderFilter, setAuthProviderFilter] = useState<
    "all" | "email" | "google"
  >("all");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      !!user.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" ||
      !!user.roles?.some((role) => role.id === roleFilter);

    const matchesAuthProvider =
      authProviderFilter === "all" || user.authProvider === authProviderFilter;

    return matchesSearch && matchesRole && matchesAuthProvider;
  });

  const renderRoleBadges = (user: UserWithRoles) => {
    if (!user.roles || user.roles.length === 0) {
      return <Badge variant="outline">No roles</Badge>;
    }

    if (user.roles.length > 2) {
      return (
        <>
          {user.roles.slice(0, 2).map((role) => (
            <Badge key={role.id} variant="outline">
              {role.name}
            </Badge>
          ))}
          <Badge variant="outline">+{user.roles.length - 2} more</Badge>
        </>
      );
    }

    return user.roles.map((role) => (
      <Badge key={role.id} variant="outline">
        {role.name}
      </Badge>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={authProviderFilter}
            onValueChange={(value: "all" | "email" | "google") =>
              setAuthProviderFilter(value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by auth provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="google">Google</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Auth Provider</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                No users found
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.name || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.authProvider === "google" ? "secondary" : "outline"
                    }
                  >
                    {user.authProvider}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {renderRoleBadges(user)}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(user.createdAt || ""), "MMM d, yyyy")}
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
                        className="cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setUserForRoleAssignment(user)}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        Assign roles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setUserForEdit(user)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit user
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setUserForPasswordUpdate(user)}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Change password
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => e.preventDefault()}
                      >
                        <DeleteUser userId={userId} id={user.id} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <UserDetailsDialog
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />

      <AssignRoleDialog
        userId={userId}
        user={userForRoleAssignment}
        roles={roles}
        open={!!userForRoleAssignment}
        onOpenChange={(open) => !open && setUserForRoleAssignment(null)}
      />

      <EditUserDialog
        userId={userId}
        user={userForEdit}
        open={!!userForEdit}
        onOpenChange={(open) => !open && setUserForEdit(null)}
      />

      <ChangePasswordDialog
        userId={userId}
        user={userForPasswordUpdate}
        open={!!userForPasswordUpdate}
        onOpenChange={(open) => !open && setUserForPasswordUpdate(null)}
      />
    </div>
  );
}
