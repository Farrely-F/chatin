"use client";

import { Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function ChatDisclaimer() {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <AnimatePresence>
      <motion.div
        {...animations}
        className="text-center mx-auto mt-2 text-xs text-muted-foreground max-w-xs sm:max-w-md"
      >
        <Info className="size-3 inline-block mr-2" />
        AI can make mistakes, always make sure the information is valid twice
      </motion.div>
    </AnimatePresence>
  );
}
