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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type AgentFeedbackClientItem,
  deleteAgentFeedbackAction,
  listAgentFeedbackAction,
  updateAgentFeedbackAction,
} from "./agent-feedback-actions";

type FeedbackDraft = {
  isHelpful: boolean;
  expectedResponse: string;
  feedbackNote: string;
};

const initialDraft: FeedbackDraft = {
  isHelpful: true,
  expectedResponse: "",
  feedbackNote: "",
};

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "-";
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

export default function AgentFeedbackManagement({
  agentId,
  initialFeedbacks,
}: {
  readonly agentId: string;
  readonly initialFeedbacks: AgentFeedbackClientItem[];
}) {
  const [feedbacks, setFeedbacks] =
    useState<AgentFeedbackClientItem[]>(initialFeedbacks);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FeedbackDraft>(initialDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshFeedbacks = async () => {
    setIsRefreshing(true);

    try {
      const result = await listAgentFeedbackAction(agentId);

      if (!result.status) {
        throw new Error(result.error || "Failed to load feedback");
      }

      setFeedbacks(result.data);
      if (editingId && !result.data.some((item) => item.id === editingId)) {
        setEditingId(null);
        setDraft(initialDraft);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load feedback",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const onEdit = (item: AgentFeedbackClientItem) => {
    setEditingId(item.id);
    setDraft({
      isHelpful: item.isHelpful,
      expectedResponse: item.expectedResponse || "",
      feedbackNote: item.feedbackNote || "",
    });
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setDraft(initialDraft);
  };

  const onSave = async (feedbackId: string) => {
    if (!draft.isHelpful && draft.expectedResponse.trim().length === 0) {
      toast.error("Expected response is required for corrective feedback");
      return;
    }

    setSavingId(feedbackId);

    try {
      const result = await updateAgentFeedbackAction({
        agentId,
        feedbackId,
        isHelpful: draft.isHelpful,
        expectedResponse: draft.isHelpful ? undefined : draft.expectedResponse,
        feedbackNote: draft.feedbackNote,
      });

      if (!result.status) {
        throw new Error(result.error || "Failed to update feedback");
      }

      setFeedbacks((current) =>
        current.map((item) =>
          item.id === feedbackId
            ? {
                ...item,
                isHelpful: draft.isHelpful,
                expectedResponse: draft.isHelpful
                  ? null
                  : draft.expectedResponse.trim(),
                feedbackNote: draft.feedbackNote.trim() || null,
              }
            : item,
        ),
      );

      toast.success("Feedback updated");
      onCancelEdit();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update feedback",
      );
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (feedbackId: string) => {
    setDeletingId(feedbackId);

    try {
      const result = await deleteAgentFeedbackAction({
        agentId,
        feedbackId,
      });

      if (!result.status) {
        throw new Error(result.error || "Failed to delete feedback");
      }

      setFeedbacks((current) =>
        current.filter((item) => item.id !== feedbackId),
      );
      if (editingId === feedbackId) {
        onCancelEdit();
      }
      toast.success("Feedback deleted");
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete feedback",
      );
    } finally {
      setDeletingId(null);
    }
  };

  let feedbackContent: React.ReactNode = (
    <div className="space-y-3">
      {feedbacks.map((item) => {
        const isEditing = editingId === item.id;
        const isSaving = savingId === item.id;
        const isDeleting = deletingId === item.id;

        return (
          <div
            key={item.id}
            className="border rounded-lg p-3 bg-background space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={item.isHelpful ? "secondary" : "destructive"}>
                  {item.isHelpful ? "Helpful" : "Needs correction"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                  disabled={isSaving || isDeleting}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteTargetId(item.id)}
                  disabled={isSaving || isDeleting}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  User question
                </p>
                <div className="rounded-md border bg-muted/30 p-2 whitespace-pre-wrap">
                  {item.userQuestion}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Agent response
                </p>
                <div className="rounded-md border bg-muted/30 p-2 whitespace-pre-wrap">
                  {item.agentResponse}
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium">Edit feedback</p>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.isHelpful ? "default" : "outline"}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        isHelpful: true,
                        expectedResponse: "",
                      }))
                    }
                  >
                    Helpful
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.isHelpful ? "outline" : "default"}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        isHelpful: false,
                      }))
                    }
                  >
                    Needs correction
                  </Button>
                </div>

                {!draft.isHelpful && (
                  <Textarea
                    value={draft.expectedResponse}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        expectedResponse: e.target.value,
                      }))
                    }
                    placeholder="How should the assistant respond instead?"
                    className="min-h-[96px]"
                  />
                )}

                <Textarea
                  value={draft.feedbackNote}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      feedbackNote: e.target.value,
                    }))
                  }
                  placeholder="Optional note to improve future answers"
                  className="min-h-[72px]"
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSave(item.id)}
                    disabled={isSaving}
                  >
                    <Save className="size-4" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {item.expectedResponse && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Expected response
                    </p>
                    <div className="rounded-md border bg-muted/30 p-2 whitespace-pre-wrap">
                      {item.expectedResponse}
                    </div>
                  </div>
                )}

                {item.feedbackNote && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Feedback note
                    </p>
                    <div className="rounded-md border bg-muted/30 p-2 whitespace-pre-wrap">
                      {item.feedbackNote}
                    </div>
                  </div>
                )}
              </div>
            )}

            <AlertDialog
              open={deleteTargetId === item.id}
              onOpenChange={(open) => setDeleteTargetId(open ? item.id : null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This feedback will be removed and no longer used for future
                    response guidance.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={() => onDelete(item.id)}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );

  if (feedbacks.length === 0) {
    feedbackContent = (
      <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
        No feedback submitted yet from playground responses.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium">Response Feedback</h3>
          <p className="text-xs text-muted-foreground">
            Review, revise, and remove feedback used to guide this agent.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshFeedbacks}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {feedbackContent}
    </div>
  );
}
