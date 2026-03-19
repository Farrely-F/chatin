"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentFeedbackClientItem } from "@/features/agents/agent-feedback-actions";
import { AgentDetails } from "@/service/agents";
import { KnowledgeBase } from "@/service/knowledgebases";
import { ModelDetails } from "@/service/model";
import { PersonaDetails } from "@/service/personas";
import {
  EditIcon,
  FlaskConical,
  LucideBookCopy,
  MessageSquareWarning,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import AgentFeedbackManagement from "./agent-feedback-management";
import AgentKnowledgebases from "./agent-knowledgebases";
import DeployAgent from "./deploy-agent";
import EditAgenConfig from "./edit-agent";

const agentMenu = [
  {
    id: "agent-details",
    label: "Agent Details",
    icon: EditIcon,
  },
  {
    id: "training-data",
    label: "Training Data",
    icon: LucideBookCopy,
  },
  {
    id: "response-feedback",
    label: "Response Feedback",
    icon: MessageSquareWarning,
  },
];

export default function AgentDetailView({
  agentDetails,
  models,
  agentKnowledgeBases,
  agentFeedbacks,
  personas,
  userId,
}: {
  readonly agentDetails: AgentDetails;
  readonly models: ModelDetails[];
  readonly agentKnowledgeBases: KnowledgeBase[];
  readonly agentFeedbacks: AgentFeedbackClientItem[];
  readonly personas: PersonaDetails[];
  readonly userId: string;
}) {
  const [selectedMenu, setSelectedMenu] = useState(agentMenu[0].id);

  const handleMenuClick = (menuId: string) => {
    setSelectedMenu(menuId);
  };

  return (
    <div className="grid sm:grid-cols-8 w-full gap-2 border rounded-lg min-h-[400px] mt-6 p-2">
      <ScrollArea className="flex-1 bg-gray-100 rounded-lg sm:col-span-2">
        {agentMenu.map((menu) => (
          <button
            key={menu.label}
            className={`flex gap-2 items-center p-4 w-full hover:bg-gray-50 hover:text-black ${menu.id === selectedMenu ? "bg-gray-200 text-black" : "text-muted-foreground"}`}
            onClick={() => handleMenuClick(menu.id)}
          >
            <menu.icon className="size-4" />
            <p className="text-sm">{menu.label}</p>
          </button>
        ))}
        <div className="p-2">
          <Button asChild variant={"outline"}>
            <Link
              href={`/dashboard/agents/${agentDetails.id}/chat`}
              className={`flex gap-2 items-center w-full text-muted-foreground hover:bg-gray-50`}
            >
              <FlaskConical className="size-4" />
              <p className="text-sm">Playground</p>
            </Link>
          </Button>
        </div>
        <div className="p-2">
          <DeployAgent
            agentId={agentDetails.id}
            agentStatus={agentDetails.status}
            userId={userId}
          />
        </div>
      </ScrollArea>
      <div className="bg-gray-100 sm:col-span-6 rounded-lg p-4 overflow-y-auto">
        {selectedMenu === "agent-details" && (
          <EditAgenConfig
            models={models}
            agentDetails={agentDetails}
            userId={userId}
            personas={personas}
          />
        )}

        {selectedMenu === "training-data" && (
          <AgentKnowledgebases
            agentKnowledgeBases={agentKnowledgeBases}
            agentDetails={agentDetails}
            models={models}
            userId={userId}
          />
        )}

        {selectedMenu === "response-feedback" && (
          <AgentFeedbackManagement
            agentId={agentDetails.id}
            initialFeedbacks={agentFeedbacks}
          />
        )}
      </div>
    </div>
  );
}
