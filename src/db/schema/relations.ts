import { relations } from "drizzle-orm";

import { agents } from "./agents";
import { knowledgeBases } from "./knowledgebases";
import { aiModels } from "./models";
import { personas } from "./personas";
import { users } from "./users";

export const userRelations = relations(users, ({ many }) => ({
  agents: many(agents),
}));

export const agentRelations = relations(agents, ({ many, one }) => ({
  knowledgeBases: many(knowledgeBases),
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
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

export const personaRelations = relations(personas, ({ many }) => ({
  agents: many(agents),
}));

export const aiModelRelations = relations(aiModels, ({ many }) => ({
  agents: many(agents),
}));
