import { LoaderCircleIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="dark bg-sidebar flex h-screen items-center justify-center">
      <LoaderCircleIcon className="text-foreground animate-spin" />
    </div>
  );
}
