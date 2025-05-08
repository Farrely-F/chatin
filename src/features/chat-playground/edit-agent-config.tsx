"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AgentDetails } from "@/service/agents";
import { ModelDetails } from "@/service/model";
import { PersonaDetails } from "@/service/personas";
import { Settings } from "lucide-react";
import { useState } from "react";

import EditAgenConfig from "../agents/edit-agent";

export default function EditAgentDialog({
  agentDetails,
  models,
  personas,
  userId,
  disabled,
}: {
  agentDetails: AgentDetails;
  models: ModelDetails[];
  personas: PersonaDetails[];
  userId: string;
  disabled: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <SheetTrigger asChild>
        <Button disabled={disabled} variant={"outline"} size={"icon"}>
          <Settings />
        </Button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Config</SheetTitle>
        </SheetHeader>

        <ScrollArea className="p-4 h-[calc(100svh-90px)]">
          <EditAgenConfig
            models={models}
            personas={personas}
            agentDetails={agentDetails}
            userId={userId}
            callback={() => setIsDialogOpen(false)}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
