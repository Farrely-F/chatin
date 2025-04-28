"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { truncateCharacters } from "@/lib/utils";
import { AgentDetails } from "@/service/agents";
import { KnowledgeBase } from "@/service/knowledgebases";
import { Eye } from "lucide-react";
import { useState } from "react";

import CrawlURL from "../knowledgebases/crawl-url";
import DeleteKnowledgeBase from "../knowledgebases/delete-knowledgebase";
import { TextKnowledgebase } from "../knowledgebases/text-knowledgebase";
import UploadKnowledgeForm from "../knowledgebases/upload-knowledgebase";
import PreviewKnowledgebase from "./preview-knowledgebase";

export default function AgentKnowledgebases({
  agentKnowledgeBases,
  agentDetails,
  userId,
}: {
  agentKnowledgeBases: KnowledgeBase[];
  agentDetails: AgentDetails;
  userId: string;
}) {
  const [documentPreview, setDocumentPreview] = useState<KnowledgeBase | null>(
    null,
  );

  return (
    <>
      <div className="h-full">
        <Tabs defaultValue="knowledgebases">
          <TabsList className="overflow-x-auto justify-start max-sm:w-full">
            <TabsTrigger value="knowledgebases">🧠 Knowledgebases</TabsTrigger>
            <TabsTrigger value="document">📙 Document</TabsTrigger>
            <TabsTrigger value="url">🔗 URL</TabsTrigger>
            <TabsTrigger value="text">📝 Text</TabsTrigger>
          </TabsList>
          <Separator className="my-2" />
          <TabsContent value="knowledgebases" className="space-y-2">
            {agentKnowledgeBases.length > 0 ? (
              agentKnowledgeBases.map((source) => (
                <div
                  key={source.id}
                  className="border p-4 bg-background rounded-lg w-full h-full"
                >
                  <div className="text-start grid sm:grid-cols-2 gap-2 items-center pb-2">
                    <div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h3>{truncateCharacters(source.fileName!, 50)}</h3>
                          </TooltipTrigger>

                          <TooltipContent
                            className="dark max-w-sm"
                            align="start"
                          >
                            <p>{source.fileName}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <p className="text-xs">
                        {source.createdAt?.toDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {source.sourceType === "pdf" && (
                        <Button
                          onClick={() => setDocumentPreview(source)}
                          size={"icon"}
                          variant={"outline"}
                        >
                          <Eye />
                        </Button>
                      )}
                      <DeleteKnowledgeBase
                        agentId={agentDetails.id}
                        knowledgeBaseId={source.id}
                        type={source.sourceType}
                        filePath={source.filePath || ""}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center w-full h-[400px] text-muted-foreground">
                <p>Your agent knowledgebase is empty.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="document">
            <UploadKnowledgeForm agentId={agentDetails.id} userId={userId} />
          </TabsContent>
          <TabsContent value="url">
            <CrawlURL agentId={agentDetails.id} />
          </TabsContent>
          <TabsContent value="text">
            <TextKnowledgebase agentId={agentDetails.id} />
          </TabsContent>
        </Tabs>
      </div>

      {documentPreview && (
        <PreviewKnowledgebase
          open={!!documentPreview}
          onOpenChange={(open) =>
            setDocumentPreview(open ? documentPreview : null)
          }
          knowledge={documentPreview}
        />
      )}
    </>
  );
}
