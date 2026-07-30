"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, X } from "lucide-react";
import {
  clampPassTargetPercent,
  MAX_PASS_TARGET_PERCENT,
  MIN_PASS_TARGET_PERCENT,
  readPassTargetPercent,
  writePassTargetPercent,
} from "@/lib/pass-target";
import { cn } from "@/lib/utils";

export function OverallAccuracy({
  accuracy,
  targetPercent: defaultTarget,
  onTargetChange,
}: {
  accuracy: number;
  targetPercent: number;
  /** Called after the user saves a new pass target %. */
  onTargetChange?: (next: number) => void;
}) {
  const [targetPercent, setTargetPercent] = useState(defaultTarget);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(defaultTarget));

  useEffect(() => {
    const stored = readPassTargetPercent(defaultTarget);
    setTargetPercent(stored);
    setDraft(String(stored));
  }, [defaultTarget]);

  const pointsToTarget = Math.max(targetPercent - accuracy, 0);
  const pct = Math.min(accuracy, 100);

  const save = () => {
    const next = clampPassTargetPercent(Number(draft));
    writePassTargetPercent(next);
    setTargetPercent(next);
    setDraft(String(next));
    setEditing(false);
    onTargetChange?.(next);
  };

  const cancel = () => {
    setDraft(String(targetPercent));
    setEditing(false);
  };

  // Mirrors the `flex-1` on the engagement panel opposite: whichever of the two
  // analytics columns runs short pads out here, so both end on the same line.
  return (
    <div className="flex-1 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Overall Accuracy
          </p>
          <span className="text-5xl font-bold tabular-nums tracking-tight">
            {accuracy}%
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pass Target
          </p>
          {editing ? (
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <input
                type="number"
                min={MIN_PASS_TARGET_PERCENT}
                max={MAX_PASS_TARGET_PERCENT}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") cancel();
                }}
                className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right text-2xl font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Pass target percent"
                autoFocus
              />
              <span className="text-2xl font-bold">%</span>
              <button
                type="button"
                onClick={save}
                className="rounded-md p-1 text-emerald-600 hover:bg-muted"
                aria-label="Save pass target"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={cancel}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(String(targetPercent));
                setEditing(true);
              }}
              className={cn(
                "group mt-0.5 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              )}
              title="Edit pass target"
            >
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {targetPercent}%
              </span>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100" />
            </button>
          )}
        </div>
      </div>

      <div className="relative mt-4">
        <div className="h-3 w-full overflow-hidden bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div
          className="absolute top-0 h-3 w-0.5 bg-foreground/40"
          style={{ left: `${targetPercent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {pointsToTarget > 0
          ? `${pointsToTarget}% to pass target`
          : "Pass target reached!"}{" "}
        &middot; Set your own goal ({MIN_PASS_TARGET_PERCENT}–
        {MAX_PASS_TARGET_PERCENT}%)
      </p>
    </div>
  );
}
