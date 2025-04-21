import { z } from "zod";

export const addPermissionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is too short"),
  description: z.string().optional(),
  permission: z.string().min(1, "Permission is required"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type AddPermissionSchema = z.infer<typeof addPermissionSchema>;
