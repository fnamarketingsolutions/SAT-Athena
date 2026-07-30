"use client";

import { useEffect } from "react";

/**
 * Locks page scroll while the calling component is mounted.
 *
 * Reference counted on purpose. Several surfaces lock the page — the
 * micro-lesson route and the lesson component inside it, the quiz layout, the
 * quest provider — and their lifetimes nest and overlap across route
 * transitions. When each one saves and restores `body.style.overflow` itself,
 * whichever locks second captures "hidden" as the value to put back, so
 * unmounting re-locks the page and every route visited afterwards is stuck
 * unscrollable until a full reload. Counting makes the release unambiguous:
 * the original value returns only once the last lock is released.
 */
let lockCount = 0;
let restoreOverflow = "";

export function useBodyScrollLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    if (lockCount === 0) {
      restoreOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = restoreOverflow;
      }
    };
  }, [enabled]);
}
