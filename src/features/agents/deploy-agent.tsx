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
import { Button } from "@/components/ui/button";
import { changeAgentStatus } from "@/service/agents";
import { Archive, Rocket } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function DeployAgent({
  agentId,
  agentStatus,
  userId,
}: {
  agentId: string;
  agentStatus: "active" | "archived";
  userId: string;
}) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const res = await changeAgentStatus(agentId, userId, agentStatus);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      setIsAlertOpen(false);
      toast.success(res.message);
    });
  };

  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={agentStatus === "archived" ? "gradient" : "outline"}
          className="w-full"
        >
          {agentStatus === "archived" ? (
            <Rocket className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
          <p className="text-sm">
            {agentStatus === "archived" ? "Deploy" : "Archive"}
          </p>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>

          <AlertDialogDescription>
            This action is irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggleStatus}
            disabled={isPending}
            variant={agentStatus === "archived" ? "default" : "destructive"}
          >
            Proceed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
