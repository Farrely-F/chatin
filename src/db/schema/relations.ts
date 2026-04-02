import { relations } from "drizzle-orm";

import { agents } from "./agents";
import { knowledgeBases } from "./knowledgebases";
import { aiModels } from "./models";
import { organizationUserRoles } from "./organization-user-roles";
import { organizationMembers, organizations } from "./organizations";
import { personas } from "./personas";
import { roles } from "./roles";
import { users } from "./users";

export const userRelations = relations(users, ({ many }) => ({
  agents: many(agents),
  organizationMemberships: many(organizationMembers),
  organizationRoleAssignments: many(organizationUserRoles),
}));

export const agentRelations = relations(agents, ({ many, one }) => ({
  knowledgeBases: many(knowledgeBases),
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [agents.organizationId],
    references: [organizations.id],
  }),
  personas: one(personas, {
    fields: [agents.personaId],
    references: [personas.id],
  }),
  model: one(aiModels, {
    fields: [agents.modelId],
    references: [aiModels.id],
  }),
}));

export const knowledgeBaseRelations = relations(knowledgeBases, ({ one }) => ({
  agent: one(agents, {
    fields: [knowledgeBases.agentId],
    references: [agents.id],
  }),
}));

export const personaRelations = relations(personas, ({ many, one }) => ({
  agents: many(agents),
  organization: one(organizations, {
    fields: [personas.organizationId],
    references: [organizations.id],
  }),
}));

export const aiModelRelations = relations(aiModels, ({ many }) => ({
  agents: many(agents),
}));

export const organizationRelations = relations(
  organizations,
  ({ many, one }) => ({
    createdByUser: one(users, {
      fields: [organizations.createdBy],
      references: [users.id],
    }),
    members: many(organizationMembers),
    roleAssignments: many(organizationUserRoles),
    agents: many(agents),
    personas: many(personas),
  }),
);

export const organizationMemberRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
    invitedByUser: one(users, {
      fields: [organizationMembers.invitedBy],
      references: [users.id],
    }),
  }),
);

export const organizationUserRoleRelations = relations(
  organizationUserRoles,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationUserRoles.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationUserRoles.userId],
      references: [users.id],
    }),
    role: one(roles, {
      fields: [organizationUserRoles.roleId],
      references: [roles.id],
    }),
  }),
);
