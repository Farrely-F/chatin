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
import { Button } from "@/components/ui/button";
import { deleteApiKey, revokeApiKey } from "@/service/api-key";
import { useTransition } from "react";
import { toast } from "sonner";

export default function ApiKeyAction({
  action,
  id,
}: {
  action: "revoke" | "delete";
  id: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleApiKeyAction = () => {
    startTransition(async () => {
      const res =
        action === "revoke" ? await revokeApiKey(id) : await deleteApiKey(id);

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={isPending}
          size="sm"
          variant={action === "revoke" ? "outline" : "destructive"}
          type="submit"
        >
          {action === "revoke" ? "Revoke" : "Delete"}
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
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-destructive hover:bg-red-600"
            onClick={handleApiKeyAction}
          >
            Proceed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
