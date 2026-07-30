"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type StuckModalProps = {
  onAccept: () => void;
  onDecline: () => void;
  title?: string;
  description?: string;
  acceptLabel?: string;
  declineLabel?: string;
};

export function StuckModal({
  onAccept,
  onDecline,
  title = "Looks like you're stuck",
  description = "Athena can walk you through this step by step.",
  acceptLabel = "Walk me through it",
  declineLabel = "Not now",
}: StuckModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm md:left-[15rem]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stuck-modal-title"
      aria-describedby="stuck-modal-description"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 4 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="px-8 py-8 text-center">
          <div className="mb-5 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>

          <h2
            id="stuck-modal-title"
            className="mb-2 text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p id="stuck-modal-description" className="text-sm text-muted-foreground">
            {description}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onAccept} className="w-full sm:w-auto">
              {acceptLabel}
            </Button>
            <Button variant="outline" onClick={onDecline} className="w-full sm:w-auto">
              {declineLabel}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
