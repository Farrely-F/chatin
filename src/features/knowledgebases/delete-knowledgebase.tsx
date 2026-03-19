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
import { deleteKnowledgeBaseById } from "@/service/knowledgebases";
import { Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function DeleteKnowledgeBase({
  agentId,
  knowledgeBaseId,
  type,
  filePath,
}: {
  agentId: string;
  knowledgeBaseId: string;
  type: string;
  filePath: string;
}) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const res = await deleteKnowledgeBaseById(
        agentId,
        knowledgeBaseId,
        type,
        filePath,
      );

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
          size={"icon"}
          variant={"destructive"}
          disabled={isPending}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash />
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
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            Proceed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
