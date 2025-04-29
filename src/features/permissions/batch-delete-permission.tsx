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
import { withPermission } from "@/lib/check-permission";
import { batchDeletePermission } from "@/service/permissions";
import { Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTransition } from "react";
import { toast } from "sonner";

export default function BatchDeletePermission({
  ids,
  setBatchSelectIds,
}: {
  ids: string[];
  setBatchSelectIds: (ids: string[]) => void;
}) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: batchDeletePermission,
          permission: "system.delete",
          userId: session?.user.id || "",
        },
        ids,
      );

      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      setBatchSelectIds([]);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={"outline"} size={"icon"} className="text-destructive">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            permission.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
