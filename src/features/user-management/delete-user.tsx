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
import { withPermission } from "@/lib/check-permission";
import { deleteUser } from "@/service/users";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export default function DeleteUser({
  userId,
  id,
}: {
  userId: string;
  id: string;
}) {
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: deleteUser,
          userId: userId,
          permission: "system.delete",
        },
        id,
      );

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
        <button
          className="text-red-500 hover:text-red-600 flex items-center gap-2 w-full"
          aria-label="Delete"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the user.
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
