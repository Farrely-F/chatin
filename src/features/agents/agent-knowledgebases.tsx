"use client";

import { Button } from "@/components/ui/button";
import { AgentDetails } from "@/service/agents";
import { KnowledgeBase } from "@/service/knowledgebases";
import { Eye } from "lucide-react";
import { useState } from "react";

import DeleteKnowledgeBase from "../knowledgebases/delete-knowledgebase";

export default function AgentKnowledgebases({
  agentKnowledgeBases,
  agentDetails,
}: {
  agentKnowledgeBases: KnowledgeBase[];
  agentDetails: AgentDetails;
}) {
  const [documentPreview, setDocumentPreview] = useState<KnowledgeBase | null>(
    null,
  );

  return (
    <div className="h-full">
      {agentKnowledgeBases.map((source) => (
        <div
          key={source.id}
          className="border px-2 py-4 bg-background rounded-lg w-full h-full"
        >
          <div className="text-start flex justify-between border-b pb-2">
            <div>
              <h3>{source.fileName}</h3>
              <p className="text-xs">{source.createdAt?.toDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setDocumentPreview(source)}
                size={"icon"}
                variant={"outline"}
              >
                <Eye />
              </Button>
              <DeleteKnowledgeBase
                agentId={agentDetails.id}
                knowledgeBaseId={source.id}
                filePath={source.filePath || ""}
              />
            </div>
          </div>

          {documentPreview && (
            <div className="h-full pb-4">
              <iframe
                className="w-full h-full mt-2 rounded-lg"
                src={documentPreview?.sourceUrl || ""}
              ></iframe>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
