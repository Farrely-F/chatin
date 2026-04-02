"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  type OrganizationOverview,
  batchAssignUsersToOrganization,
  createOrganization,
  forceUnassignUsersFromOrganization,
  updateOrganizationDetails,
} from "@/service/organizations";
import type { UserWithRoles } from "@/service/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Plus, UserMinus, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
});

type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;

const batchAssignSchema = z.object({
  organizationId: z.uuid(),
  userIds: z.array(z.uuid()).min(1, "Select at least one user"),
  role: z.enum(["admin", "member"]),
});

type BatchAssignFormValues = z.infer<typeof batchAssignSchema>;

const forceUnassignSchema = z.object({
  organizationId: z.uuid(),
  userIds: z.array(z.uuid()).min(1, "Select at least one user"),
});

type ForceUnassignFormValues = z.infer<typeof forceUnassignSchema>;

const editOrganizationSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
});

type EditOrganizationFormValues = z.infer<typeof editOrganizationSchema>;

export function OrganizationsManagement({
  actorUserId,
  organizations,
  users,
}: Readonly<{
  actorUserId: string;
  organizations: OrganizationOverview[];
  users: UserWithRoles[];
}>) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBatchAssignOpen, setIsBatchAssignOpen] = useState(false);
  const [isForceUnassignOpen, setIsForceUnassignOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [unassignUserSearch, setUnassignUserSearch] = useState("");
  const [selectedOrganization, setSelectedOrganization] =
    useState<OrganizationOverview | null>(null);
  const [isPending, startTransition] = useTransition();

  const createForm = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const batchAssignForm = useForm<BatchAssignFormValues>({
    resolver: zodResolver(batchAssignSchema),
    defaultValues: {
      organizationId: "",
      userIds: [],
      role: "member",
    },
  });

  const forceUnassignForm = useForm<ForceUnassignFormValues>({
    resolver: zodResolver(forceUnassignSchema),
    defaultValues: {
      organizationId: "",
      userIds: [],
    },
  });

  const editForm = useForm<EditOrganizationFormValues>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues: {
      organizationId: "",
      name: "",
      description: "",
    },
  });

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const emailMatch = user.email.toLowerCase().includes(query);
      const nameMatch = (user.name ?? "").toLowerCase().includes(query);

      return emailMatch || nameMatch;
    });
  }, [userSearch, users]);

  const selectedUnassignOrganizationId =
    forceUnassignForm.watch("organizationId");

  const unassignMembers = useMemo(() => {
    if (!selectedUnassignOrganizationId) {
      return [];
    }

    const organization = organizations.find(
      (item) => item.id === selectedUnassignOrganizationId,
    );

    return organization?.members ?? [];
  }, [organizations, selectedUnassignOrganizationId]);

  const filteredUnassignMembers = useMemo(() => {
    const query = unassignUserSearch.trim().toLowerCase();

    if (!query) {
      return unassignMembers;
    }

    return unassignMembers.filter((member) => {
      const emailMatch = member.email.toLowerCase().includes(query);
      const nameMatch = (member.name ?? "").toLowerCase().includes(query);

      return emailMatch || nameMatch;
    });
  }, [unassignMembers, unassignUserSearch]);

  const onCreateOrganization = (values: CreateOrganizationFormValues) => {
    startTransition(async () => {
      const result = await createOrganization(actorUserId, values);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      createForm.reset();
      setIsCreateOpen(false);
      router.refresh();
    });
  };

  const onBatchAssign = (values: BatchAssignFormValues) => {
    startTransition(async () => {
      const result = await batchAssignUsersToOrganization(
        actorUserId,
        values.organizationId,
        values.userIds,
        values.role,
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      batchAssignForm.reset({
        organizationId: "",
        userIds: [],
        role: "member",
      });
      setIsBatchAssignOpen(false);
      setSelectedOrganization(null);
      setUserSearch("");
      router.refresh();
    });
  };

  const onEditOrganization = (values: EditOrganizationFormValues) => {
    startTransition(async () => {
      const result = await updateOrganizationDetails(
        actorUserId,
        values.organizationId,
        {
          name: values.name,
          description: values.description,
        },
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      setIsEditOpen(false);
      setSelectedOrganization(null);
      router.refresh();
    });
  };

  const onForceUnassign = (values: ForceUnassignFormValues) => {
    startTransition(async () => {
      const result = await forceUnassignUsersFromOrganization(
        actorUserId,
        values.organizationId,
        values.userIds,
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      forceUnassignForm.reset({
        organizationId: "",
        userIds: [],
      });
      setUnassignUserSearch("");
      setIsForceUnassignOpen(false);
      setSelectedOrganization(null);
      router.refresh();
    });
  };

  const openEditDialog = (organization: OrganizationOverview) => {
    setSelectedOrganization(organization);
    editForm.reset({
      organizationId: organization.id,
      name: organization.name,
      description: organization.description || "",
    });
    setIsEditOpen(true);
  };

  const openBatchAssignDialog = (organization: OrganizationOverview) => {
    setSelectedOrganization(organization);
    batchAssignForm.reset({
      organizationId: organization.id,
      userIds: [],
      role: "member",
    });
    setUserSearch("");
    setIsBatchAssignOpen(true);
  };

  const openForceUnassignDialog = (organization: OrganizationOverview) => {
    setSelectedOrganization(organization);
    forceUnassignForm.reset({
      organizationId: organization.id,
      userIds: [],
    });
    setUnassignUserSearch("");
    setIsForceUnassignOpen(true);
  };

  const selectedUserIds = batchAssignForm.watch("userIds");
  const selectedUnassignUserIds = forceUnassignForm.watch("userIds");

  const toggleUserSelection = (userId: string, checked: boolean) => {
    const current = batchAssignForm.getValues("userIds");

    if (checked) {
      batchAssignForm.setValue("userIds", [...new Set([...current, userId])], {
        shouldValidate: true,
      });
      return;
    }

    batchAssignForm.setValue(
      "userIds",
      current.filter((id) => id !== userId),
      { shouldValidate: true },
    );
  };

  const selectAllFilteredUsers = () => {
    const filteredIds = filteredUsers.map((user) => user.id);
    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      batchAssignForm.setValue(
        "userIds",
        selectedUserIds.filter((id) => !filteredIds.includes(id)),
        { shouldValidate: true },
      );
      return;
    }

    batchAssignForm.setValue(
      "userIds",
      [...new Set([...selectedUserIds, ...filteredIds])],
      { shouldValidate: true },
    );
  };

  const toggleUnassignUserSelection = (userId: string, checked: boolean) => {
    const current = forceUnassignForm.getValues("userIds");

    if (checked) {
      forceUnassignForm.setValue(
        "userIds",
        [...new Set([...current, userId])],
        {
          shouldValidate: true,
        },
      );
      return;
    }

    forceUnassignForm.setValue(
      "userIds",
      current.filter((id) => id !== userId),
      { shouldValidate: true },
    );
  };

  const toggleAllVisibleMembers = () => {
    const visibleIds = filteredUnassignMembers.map((member) => member.userId);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedUnassignUserIds.includes(id));

    if (allSelected) {
      forceUnassignForm.setValue(
        "userIds",
        selectedUnassignUserIds.filter((id) => !visibleIds.includes(id)),
        { shouldValidate: true },
      );
      return;
    }

    forceUnassignForm.setValue(
      "userIds",
      [...new Set([...selectedUnassignUserIds, ...visibleIds])],
      { shouldValidate: true },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Manage organizations, edit details, and batch assign users.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="mr-2 size-4" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Organizations share agents, personas, and knowledge bases.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateOrganization)}>
                  <div className="grid gap-3 py-2">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Workspace" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Internal support workspace"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button disabled={isPending} type="submit">
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isBatchAssignOpen}
            onOpenChange={(open) => {
              setIsBatchAssignOpen(open);

              if (!open) {
                setSelectedOrganization(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Batch Assign Users to Organization</DialogTitle>
                <DialogDescription>
                  Assign role for multiple users in one organization.
                </DialogDescription>
              </DialogHeader>
              <Form {...batchAssignForm}>
                <form onSubmit={batchAssignForm.handleSubmit(onBatchAssign)}>
                  <div className="grid gap-3 py-2">
                    <FormField
                      control={batchAssignForm.control}
                      name="organizationId"
                      render={({ field }) => <input type="hidden" {...field} />}
                    />

                    <div className="text-sm text-muted-foreground">
                      Organization:{" "}
                      <span className="font-medium text-foreground">
                        {selectedOrganization?.name || "-"}
                      </span>
                    </div>

                    <FormField
                      control={batchAssignForm.control}
                      name="userIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Users ({field.value.length} selected)
                          </FormLabel>
                          <div className="space-y-2">
                            <Input
                              placeholder="Search users by email or name"
                              value={userSearch}
                              onChange={(event) =>
                                setUserSearch(event.target.value)
                              }
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{filteredUsers.length} users found</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAllFilteredUsers}
                                className="h-7 px-2"
                              >
                                Toggle All Visible
                              </Button>
                            </div>
                            <ScrollArea className="h-44 rounded-md border p-2">
                              <div className="space-y-2 pr-2">
                                {filteredUsers.map((user) => {
                                  const checked = field.value.includes(user.id);

                                  return (
                                    <div
                                      key={user.id}
                                      className="flex cursor-pointer items-start justify-between rounded-md border p-2 text-sm"
                                    >
                                      <div className="min-w-0 pr-3">
                                        <div className="truncate font-medium">
                                          {user.email}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">
                                          {user.name || "No name"}
                                        </div>
                                      </div>
                                      <Checkbox
                                        aria-label={`Select ${user.email}`}
                                        checked={checked}
                                        onCheckedChange={(state) =>
                                          toggleUserSelection(
                                            user.id,
                                            state === true,
                                          )
                                        }
                                        className="mt-1"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={batchAssignForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membership Role</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button disabled={isPending} type="submit">
                      Assign Users
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isForceUnassignOpen}
            onOpenChange={(open) => {
              setIsForceUnassignOpen(open);

              if (!open) {
                setSelectedOrganization(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Force Unassign Users</DialogTitle>
                <DialogDescription>
                  Remove users from organization membership and clear their
                  organization-bound agents and personas.
                </DialogDescription>
              </DialogHeader>
              <Form {...forceUnassignForm}>
                <form
                  onSubmit={forceUnassignForm.handleSubmit(onForceUnassign)}
                >
                  <div className="grid gap-3 py-2">
                    <FormField
                      control={forceUnassignForm.control}
                      name="organizationId"
                      render={({ field }) => <input type="hidden" {...field} />}
                    />

                    <div className="text-sm text-muted-foreground">
                      Organization:{" "}
                      <span className="font-medium text-foreground">
                        {selectedOrganization?.name || "-"}
                      </span>
                    </div>

                    <FormField
                      control={forceUnassignForm.control}
                      name="userIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Members ({field.value.length} selected)
                          </FormLabel>
                          <div className="space-y-2">
                            <Input
                              placeholder="Search members by email or name"
                              value={unassignUserSearch}
                              onChange={(event) =>
                                setUnassignUserSearch(event.target.value)
                              }
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {filteredUnassignMembers.length} members found
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={toggleAllVisibleMembers}
                                className="h-7 px-2"
                              >
                                Toggle All Visible
                              </Button>
                            </div>
                            <ScrollArea className="h-44 rounded-md border p-2">
                              <div className="space-y-2 pr-2">
                                {filteredUnassignMembers.map((member) => {
                                  const checked = field.value.includes(
                                    member.userId,
                                  );

                                  return (
                                    <div
                                      key={member.userId}
                                      className="flex cursor-pointer items-start justify-between rounded-md border p-2 text-sm"
                                    >
                                      <div className="min-w-0 pr-3">
                                        <div className="truncate font-medium">
                                          {member.email}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">
                                          {member.name || "No name"}
                                        </div>
                                      </div>
                                      <Checkbox
                                        aria-label={`Select ${member.email}`}
                                        checked={checked}
                                        onCheckedChange={(state) =>
                                          toggleUnassignUserSelection(
                                            member.userId,
                                            state === true,
                                          )
                                        }
                                        className="mt-1"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      disabled={isPending}
                      type="submit"
                    >
                      Force Unassign
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update name and description for this organization.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditOrganization)}>
              <div className="grid gap-3 py-2">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Workspace" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Internal support workspace"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="organizationId"
                  render={({ field }) => <input type="hidden" {...field} />}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  disabled={isPending || !selectedOrganization}
                  type="submit"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Current Admins</TableHead>
              <TableHead className="w-[120px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No organizations yet.
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((organization) => {
                const admins = organization.members.filter(
                  (member) => member.role === "admin",
                );

                return (
                  <TableRow key={organization.id}>
                    <TableCell className="font-medium">
                      {organization.name}
                    </TableCell>
                    <TableCell>{organization.slug}</TableCell>
                    <TableCell>{organization.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {organization.memberCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {admins.length > 0 ? (
                          admins.slice(0, 3).map((admin) => (
                            <Badge key={admin.userId} variant="secondary">
                              {admin.name || admin.email}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">No admins</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
                            onClick={() => openEditDialog(organization)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Organization
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => openBatchAssignDialog(organization)}
                          >
                            <Users2 className="mr-2 h-4 w-4" />
                            Assign Users
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() =>
                              openForceUnassignDialog(organization)
                            }
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Unassign Users
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
