"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentDetails } from "@/service/agents";
import { KnowledgeBase } from "@/service/knowledgebases";
import { Eye } from "lucide-react";
import { useState } from "react";

import CrawlURL from "../knowledgebases/crawl-url";
import DeleteKnowledgeBase from "../knowledgebases/delete-knowledgebase";
import { TextKnowledgebase } from "../knowledgebases/text-knowledgebase";
import UploadKnowledgeForm from "../knowledgebases/upload-knowledgebase";

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
    <div className="h-full">
      <Tabs defaultValue="knowledgebases">
        <TabsList>
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
                <div className="text-start flex justify-between pb-2">
                  <div>
                    <h3>{source.fileName}</h3>
                    <p className="text-xs">
                      {source.createdAt?.toDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
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

                {documentPreview && source.sourceType === "pdf" && (
                  <div className="h-full pb-4">
                    <iframe
                      className="w-full h-full mt-2 rounded-lg"
                      src={documentPreview?.sourceUrl || ""}
                    ></iframe>
                  </div>
                )}
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
  );
}
