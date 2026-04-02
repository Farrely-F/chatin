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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  type OrganizationOverview,
  inviteUserToOrganizationByEmail,
  removeUserFromOrganization,
  updateOrganizationDetails,
} from "@/service/organizations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  description: z.string().optional(),
});

type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>;

const inviteUserSchema = z.object({
  email: z.email("Please enter a valid email"),
  role: z.enum(["admin", "member"]),
});

type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export function WorkspaceOrganizationManagement({
  actorUserId,
  organization,
}: Readonly<{
  actorUserId: string;
  organization: OrganizationOverview;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const updateForm = useForm<UpdateOrganizationFormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      description: organization.description || "",
    },
  });

  const inviteForm = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  const onUpdateOrganization = (values: UpdateOrganizationFormValues) => {
    startTransition(async () => {
      const result = await updateOrganizationDetails(
        actorUserId,
        organization.id,
        values,
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  const onInviteUser = (values: InviteUserFormValues) => {
    startTransition(async () => {
      const result = await inviteUserToOrganizationByEmail(
        actorUserId,
        values.email,
        organization.id,
        values.role,
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      inviteForm.reset({
        email: "",
        role: "member",
      });
      setIsInviteOpen(false);
      router.refresh();
    });
  };

  const onRemoveMember = (userId: string) => {
    startTransition(async () => {
      const result = await removeUserFromOrganization(
        actorUserId,
        userId,
        organization.id,
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update workspace metadata and keep membership aligned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...updateForm}>
            <form
              onSubmit={updateForm.handleSubmit(onUpdateOrganization)}
              className="grid gap-4"
            >
              <FormField
                control={updateForm.control}
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
                control={updateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What this workspace is for"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-sm text-muted-foreground">
                Slug: <span className="font-medium">{organization.slug}</span>
              </div>

              <div>
                <Button type="submit" disabled={isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Workspace Members</CardTitle>
            <CardDescription>
              Invite members and remove access from this organization.
            </CardDescription>
          </div>

          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="mr-2 size-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Add an existing user to this organization.
                </DialogDescription>
              </DialogHeader>

              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(onInviteUser)}>
                  <div className="grid gap-3 py-2">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="user@company.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={inviteForm.control}
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
                      Invite
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[140px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organization.members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              ) : (
                organization.members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "admin" ? "default" : "outline"
                        }
                        className="capitalize"
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending || member.userId === actorUserId}
                        onClick={() => onRemoveMember(member.userId)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
