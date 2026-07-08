"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type ObservationFrameProps = {
  brand?: string;
  subtitle?: string;
  onBack?: () => void;
  /** Floating action(s) — historically rendered top-right; now floats
   *  bottom-right inside the frame so the top chrome can collapse to
   *  just the BACK button. */
  headerExtra?: ReactNode;
  /** Override the default `h-screen` shell height (e.g. `h-full` inside a fixed parent). */
  className?: string;
  children: ReactNode;
};

export function ObservationFrame({
  onBack,
  headerExtra,
  className,
  children,
}: ObservationFrameProps) {
  return (
    <div
      className={cn(
        "observation-record relative flex flex-col overflow-hidden bg-background",
        className ?? "h-screen"
      )}
    >
      {/* Top chrome */}
      {onBack && (
        <div className="relative z-20 px-4 pt-3 sm:px-8">
          <button
            onClick={onBack}
            className="flex w-fit items-center gap-1.5 font-mono text-xs uppercase tracking-[0.22em] text-[var(--obs-muted)] transition-colors hover:text-[var(--obs-fg)]"
          >
            <ChevronLeft className="h-4 w-4" />
            BACK
          </button>
        </div>
      )}

      {/* Main content — no bottom padding; immersive surfaces pin their own
          input panes flush to the frame edge. Extra pb-* was clipping the
          mentor/quiz chat bars on short viewports. */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {/* Floating action(s) — bottom-right, above the corner marker. */}
      {headerExtra && (
        <div className="pointer-events-auto absolute bottom-5 right-7 z-20">
          {headerExtra}
        </div>
      )}
    </div>
  );
}
