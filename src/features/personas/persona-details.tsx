"use client";

import { AgentDetails } from "@/service/agents";
import { PersonaDetails } from "@/service/personas";

export default function PersonaDetailsView({
  agents,
  personaDetails,
  userId,
}: {
  agents: AgentDetails[];
  personaDetails: PersonaDetails;
  userId: string;
}) {
  return (
    <div className="grid sm:grid-cols-8 w-full gap-2 border rounded-lg min-h-[400px] mt-6 p-2">
      <div className="flex-1 bg-gray-100 rounded-lg sm:col-span-2"></div>
      <div className="bg-gray-100 sm:col-span-6 rounded-lg p-4 overflow-y-auto"></div>
    </div>
  );
}
