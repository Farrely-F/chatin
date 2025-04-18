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
import { deleteRole } from "@/service/roles";
import { Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTransition } from "react";
import { toast } from "sonner";

export default function DeleteRole({ id }: { id: string }) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      const res = await withPermission(
        {
          action: deleteRole,
          permission: "system.delete",
          userId: session?.user.id || "",
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
            This action cannot be undone. This will permanently delete your
            role.
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
