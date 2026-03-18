import { z } from 'zod/v4';

export const addRoleSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is too short"),
  description: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const assignRoleSchema = z.object({
  roleIds: z.array(z.string()),
});

export const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissionIds: z
    .array(z.string())
    .min(1, "At least one permission is required"),
});

export const permissionFormSchema = z.object({
  name: z.string().min(1, "Permission name is required"),
  description: z.string().optional(),
  permission: z.string().min(1, "Permission value is required"),
});

export const userRoleFormSchema = z.object({
  roleIds: z.array(z.string()).min(1, "At least one role is required"),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
export type PermissionFormValues = z.infer<typeof permissionFormSchema>;
export type UserRoleFormValues = z.infer<typeof userRoleFormSchema>;
export type AddRoleSchema = z.infer<typeof addRoleSchema>;
