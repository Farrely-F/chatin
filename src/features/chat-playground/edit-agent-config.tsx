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
import { PersonaDetails } from "@/service/personas";
import { Settings } from "lucide-react";
import { useState } from "react";

import EditAgenConfig from "../agents/edit-agent";

export default function EditAgentDialog({
  agentDetails,
  personas,
  userId,
  disabled,
}: {
  agentDetails: AgentDetails;
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

        <ScrollArea className="p-4 h-[600px]">
          <EditAgenConfig
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
