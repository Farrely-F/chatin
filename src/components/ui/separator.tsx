"use client";

import { cn } from "@/lib/utils";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as React from "react";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

function VerticalSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "h-16 relative before:absolute before:inset-y-3 before:-left-px before:w-px before:bg-gradient-to-b before:from-black/5 before:via-black/15 before:to-black/5 before:z-50",
        className,
      )}
      {...props}
    ></div>
  );
}

export { Separator, VerticalSeparator };
