import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { roles } from "./roles";
import { users } from "./users";

export const organizationUserRoles = pgTable(
  "organization_user_roles",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId, table.roleId] }),
  ],
);
