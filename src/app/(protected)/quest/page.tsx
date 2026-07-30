"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, ArrowRight } from "lucide-react";
import { useQuestContext } from "@/components/daily-quest/quest-context";
import {
  readDailyPacePreference,
  writeDailyPacePreference,
} from "@/hooks/use-pace-timer";
import { PACE_SECONDS_PER_QUESTION } from "@/lib/pacing";
import { cn } from "@/lib/utils";

function formatLimit(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function QuestStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctx = useQuestContext();
  const forcePace = searchParams.get("pace") === "1";
  const [paceOn, setPaceOn] = useState(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (forcePace) {
      writeDailyPacePreference(true);
      setPaceOn(true);
      return;
    }
    setPaceOn(readDailyPacePreference());
  }, [forcePace]);

  useEffect(() => {
    if (forcePace && !autoStartedRef.current && !ctx.practiceConfigured) {
      autoStartedRef.current = true;
      ctx.configurePractice(true);
    }
  }, [forcePace, ctx.practiceConfigured, ctx]);

  useEffect(() => {
    if (ctx.practiceConfigured) {
      router.replace(`/quest/${ctx.currentIndex + 1}`);
    }
  }, [ctx.practiceConfigured, ctx.currentIndex, router]);

  if (ctx.practiceConfigured) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Daily Practice
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        Ready for today&apos;s set?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {ctx.problems.length} questions tailored to your plan. Optional Time Pace
        trains official MBE timing ({formatLimit(PACE_SECONDS_PER_QUESTION)} per
        question).
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Time Pace</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {paceOn
                ? "Countdown above each question. Turns orange, then red, then overtime."
                : "Practice at your own pace — no per-question countdown."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={paceOn}
            onClick={() => setPaceOn((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              paceOn ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                paceOn && "translate-x-5"
              )}
            />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your choice is remembered for the next Daily Practice session.
        </p>
      </div>

      <button
        type="button"
        onClick={() => ctx.configurePractice(paceOn)}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Start practice
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function QuestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      }
    >
      <QuestStartContent />
    </Suspense>
  );
}
