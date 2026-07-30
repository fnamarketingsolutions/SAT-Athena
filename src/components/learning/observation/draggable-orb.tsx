"use client";

import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { motion, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

/** Travel before a press counts as a drag instead of a click on the orb core,
 *  which opens the character + voice picker. */
const DRAG_THRESHOLD = 5; // px
/** How much of the orb stays inside its container on every side. */
const EDGE_MARGIN = 8; // px

type DragState = {
  startX: number;
  startY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  baseX: number;
  baseY: number;
  moved: boolean;
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/**
 * The corner orb column (orb + caption below it), repositionable by dragging.
 *
 * The orb parks at `top-3 left-3` as before and only moves when the student
 * drags it, so it can be pulled off whatever it happens to be covering. The
 * column keeps `pointer-events-none` — only the orb itself takes the pointer,
 * so the caption never blocks the canvas underneath.
 */
export function DraggableOrb({
  className,
  orb,
  caption,
}: {
  /** Display utilities for the column, e.g. `flex` or `hidden sm:flex`. */
  className?: string;
  orb: ReactNode;
  caption?: ReactNode;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const drag = useRef<DragState | null>(null);
  const justDragged = useRef(false);

  const endDrag = (e: ReactPointerEvent) => {
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* never captured, or already released */
    }
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const handle = handleRef.current;
    const column = columnRef.current;
    if (!handle || !column) return;

    const baseX = x.get();
    const baseY = y.get();
    const orbRect = handle.getBoundingClientRect();
    // Confine the orb to the positioned ancestor it is anchored to. Without a
    // measurable one there is nothing sensible to clamp against, so let it roam.
    const bounds = (
      column.offsetParent as HTMLElement | null
    )?.getBoundingClientRect();

    let minX = -Infinity;
    let maxX = Infinity;
    let minY = -Infinity;
    let maxY = Infinity;
    if (bounds) {
      minX = baseX + (bounds.left + EDGE_MARGIN - orbRect.left);
      maxX = baseX + (bounds.right - EDGE_MARGIN - orbRect.right);
      minY = baseY + (bounds.top + EDGE_MARGIN - orbRect.top);
      maxY = baseY + (bounds.bottom - EDGE_MARGIN - orbRect.bottom);
      // A container too small to hold the orb inverts the bounds; pin instead.
      if (minX > maxX) minX = maxX = baseX;
      if (minY > maxY) minY = maxY = baseY;
    }

    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      minX,
      maxX,
      minY,
      maxY,
      baseX,
      baseY,
      moved: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // No button held means the pointerup was missed (it can land on the picker
    // popover). Drop the stale drag rather than let the orb chase the cursor.
    if (e.buttons === 0) {
      endDrag(e);
      return;
    }
    if (
      !d.moved &&
      Math.hypot(e.clientX - d.startX, e.clientY - d.startY) <= DRAG_THRESHOLD
    ) {
      return;
    }
    if (!d.moved) {
      d.moved = true;
      // Capture only once a real drag starts — capturing on pointerdown would
      // retarget the click away from the picker button.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* capture unavailable — the drag still tracks inside the orb */
      }
    }
    x.set(clamp(d.baseX + (e.clientX - d.startX), d.minX, d.maxX));
    y.set(clamp(d.baseY + (e.clientY - d.startY), d.minY, d.maxY));
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (drag.current?.moved) justDragged.current = true;
    endDrag(e);
  };

  const onClickCapture = (e: ReactMouseEvent) => {
    if (!justDragged.current) return;
    justDragged.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      ref={columnRef}
      style={{ x, y }}
      className={cn(
        "pointer-events-none absolute left-3 top-3 z-20 w-[220px] flex-col items-center gap-2",
        className,
      )}
    >
      <div
        ref={handleRef}
        className="pointer-events-auto cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {orb}
      </div>
      {caption}
    </motion.div>
  );
}
