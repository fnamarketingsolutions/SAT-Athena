"use client";

import { MathContent } from "@/components/quiz/math-content";
import { cn } from "@/lib/utils";

type PassagePanelProps = {
  passage: string;
  className?: string;
  label?: string;
};

export function PassagePanel({
  passage,
  className,
  label = "Passage",
}: PassagePanelProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--obs-border)]/50 bg-[var(--obs-surface)]/40",
        className
      )}
    >
      <div className="shrink-0 border-b border-[var(--obs-border)]/40 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--obs-muted)]">
          {label}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <div className="prose prose-sm max-w-none text-[var(--obs-fg)] prose-p:leading-relaxed prose-p:my-3 first:prose-p:mt-0 last:prose-p:mb-0">
          <MathContent content={passage} size="lg" />
        </div>
      </div>
    </div>
  );
}
