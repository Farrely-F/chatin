import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KnowledgeBase } from "@/service/knowledgebases";

type PreviewKnowledgeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledge: KnowledgeBase | null;
};
export default function PreviewKnowledgebase({
  open,
  onOpenChange,
  knowledge,
}: PreviewKnowledgeProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">{knowledge?.fileName}</DialogTitle>
        </DialogHeader>
        <div className="my-2">
          <iframe
            className="w-full h-[500px]"
            src={knowledge?.sourceUrl || ""}
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
