"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type ObservationFrameProps = {
  /** Deprecated: kept for backwards compatibility, no longer rendered.
   *  The brand label was redundant with the floating orb caption. */
  brand?: string;
  /** Deprecated: same as brand — no longer rendered. */
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

function CornerPlus({
  className,
  faint = false,
}: {
  className: string;
  faint?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute select-none font-mono text-sm leading-none text-[var(--obs-muted)] ${
        faint ? "opacity-40" : "opacity-70"
      } ${className}`}
    >
      +
    </span>
  );
}

export function ObservationFrame({
  onBack,
  headerExtra,
  className,
  children,
}: ObservationFrameProps) {
  return (
    <div
      className={cn(
        "observation-record relative flex flex-col overflow-hidden observation-grid-bg",
        className ?? "h-screen"
      )}
    >
      {/* Ambient vignette */}
      <div
        aria-hidden
        className="obs-vignette pointer-events-none absolute inset-0 opacity-80"
      />

      {/* Viewport corner + markers */}
      <CornerPlus className="left-3 top-3" />
      <CornerPlus className="right-3 top-3" />
      <CornerPlus className="left-3 bottom-3" />
      <CornerPlus className="right-3 bottom-3" />
      <CornerPlus className="left-3 top-1/2 -translate-y-1/2" faint />
      <CornerPlus className="right-3 top-1/2 -translate-y-1/2" faint />

      {/* Top chrome — minimized: just the BACK affordance. The brand
          and subtitle labels were redundant with the orb caption and
          have been dropped. */}
      {onBack && (
        <div className="relative z-20 px-8 pt-3">
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
