"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PublicDeployedAgent, forceArchiveAgent } from "@/service/agents";
import { format } from "date-fns";
import { Archive } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function ForceArchiveAgentButton({
  agentId,
  userId,
}: {
  agentId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleArchive = (event: React.MouseEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const res = await forceArchiveAgent(agentId, userId);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      setOpen(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          <Archive className="size-4" />
          <span>Archive</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this agent?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the agent from public access and cannot be undone here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isPending}
            variant="destructive"
          >
            Proceed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PublicDeployedAgents({
  userId,
  agents,
}: {
  userId: string;
  agents: PublicDeployedAgent[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgents = agents.filter((agent) => {
    const haystack = [agent.name, agent.slug, agent.ownerEmail, agent.ownerName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchQuery.toLowerCase());
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle>Public Deployments</CardTitle>
        </div>
        <Input
          placeholder="Search agents, owners, or slugs..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="sm:max-w-xs"
        />
      </CardHeader>
      <CardContent className="@container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[130px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No public agents found
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{agent.name}</span>
                      {agent.description ? (
                        <span className="text-xs text-muted-foreground">
                          {agent.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{agent.ownerEmail}</span>
                      {agent.ownerName ? (
                        <span className="text-xs text-muted-foreground">
                          {agent.ownerName}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{agent.slug}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{agent.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {agent.createdAt
                      ? format(new Date(agent.createdAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <ForceArchiveAgentButton
                      agentId={agent.id}
                      userId={userId}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
