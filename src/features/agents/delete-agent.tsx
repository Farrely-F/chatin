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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteAgentById } from "@/service/agents";
import { DropdownMenuTriggerProps } from "@radix-ui/react-dropdown-menu";
import { MoreVerticalIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function DeleteAgent({
  agentId,
  userId,
  ...props
}: { agentId: string; userId: string } & DropdownMenuTriggerProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const res = await deleteAgentById(agentId, userId);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      setIsAlertOpen(false);
      toast.success(res.message);
    });
  };

  return (
    <DropdownMenu
      open={isAlertOpen}
      onOpenChange={setIsAlertOpen}
      modal={false}
    >
      <DropdownMenuTrigger
        asChild
        {...props}
        onClick={(e) => e.preventDefault()}
      >
        <Button
          variant="ghost"
          className="size-5 p-0 hover:bg-transparent z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64 p-2" align="end">
        <DropdownMenuItem className="gap-2 px-2" asChild>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full text-destructive text-xs"
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2Icon className="text-destructive" />
                Delete
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
                <AlertDialogCancel
                  onClick={(e) => e.stopPropagation()}
                  disabled={isPending}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-red-600"
                >
                  Proceed
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
