"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AgentDetails } from "@/service/agents";
import { Settings } from "lucide-react";
import { useState } from "react";

import EditAgenConfig from "../agents/edit-agent";

export default function EditAgentDialog({
  agentDetails,
  userId,
  disabled,
}: {
  agentDetails: AgentDetails;
  userId: string;
  disabled: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild disabled={disabled}>
        <Button variant={"outline"} size={"icon"}>
          <Settings />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg lg:min-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Config</DialogTitle>
        </DialogHeader>
        <EditAgenConfig
          agentDetails={agentDetails}
          userId={userId}
          callback={() => setIsDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
