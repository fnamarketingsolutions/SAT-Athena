"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  NATIONAL_MBE_TARGET,
  probabilityNearTarget,
  targetStateStatus,
  type PassProbabilityResult,
} from "@/lib/pass-probability";
import {
  clampCustomMbeTarget,
  MAX_CUSTOM_MBE_TARGET,
  MIN_CUSTOM_MBE_TARGET,
} from "@/lib/pass-target";
import {
  getTargetState,
  readStoredTargetStateCode,
  TARGET_STATES,
  ubeTargetFromMbe,
  writeStoredTargetStateCode,
} from "@/lib/target-states";
import { MOCK_EXAM_ROUTE } from "@/lib/exam-config";
import { cn } from "@/lib/utils";

type PassProbabilityPanelProps = {
  data: PassProbabilityResult;
  compact?: boolean;
};

async function patchTargetScore(targetScore: number) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetScore }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to save target");
  }
}

export function PassProbabilityPanel({
  data,
  compact = false,
}: PassProbabilityPanelProps) {
  const queryClient = useQueryClient();
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [customMbe, setCustomMbe] = useState(NATIONAL_MBE_TARGET);
  const [draftMbe, setDraftMbe] = useState(String(NATIONAL_MBE_TARGET));

  useEffect(() => {
    const code = readStoredTargetStateCode();
    setStateCode(code);
    const fromState = getTargetState(code)?.mbeTarget;
    const initial =
      fromState ??
      (data.mbeTarget > 0 ? data.mbeTarget : NATIONAL_MBE_TARGET);
    setCustomMbe(initial);
    setDraftMbe(String(initial));
  }, [data.mbeTarget]);

  const selected = getTargetState(stateCode);
  const effectiveTarget = selected?.mbeTarget ?? customMbe;
  const targetLabel = selected?.barLabel ?? "Custom goal";

  const display = useMemo(() => {
    const status = targetStateStatus(data.projectedMbe, effectiveTarget);
    const passProbability = probabilityNearTarget(
      data.projectedMbe,
      effectiveTarget
    );

    return {
      passProbability,
      statusLabel: status,
      line: (
        <>
          Your Projected MBE:{" "}
          <span className="font-semibold tabular-nums">{data.projectedMbe}</span>
          {" / Target: "}
          <span className="font-semibold tabular-nums">{effectiveTarget}</span>
          {" "}
          <span className="text-muted-foreground">({targetLabel})</span>
          {" "}
          <span
            className={cn(
              "italic",
              status === "On Track"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            ({status})
          </span>
        </>
      ),
    };
  }, [data.projectedMbe, effectiveTarget, targetLabel]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const saveStateMutation = useMutation({
    mutationFn: async (code: string) => {
      const state = getTargetState(code);
      if (!state) throw new Error("Unknown state");
      await patchTargetScore(ubeTargetFromMbe(state.mbeTarget));
      return state;
    },
    onSuccess: (state) => {
      writeStoredTargetStateCode(state.code);
      setStateCode(state.code);
      setCustomMbe(state.mbeTarget);
      setDraftMbe(String(state.mbeTarget));
      setOpen(false);
      invalidate();
      toast.success(`Target set to ${state.mbeTarget} (${state.barLabel})`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save target state");
    },
  });

  const saveCustomMutation = useMutation({
    mutationFn: async (mbe: number) => {
      const clamped = clampCustomMbeTarget(mbe);
      await patchTargetScore(ubeTargetFromMbe(clamped));
      return clamped;
    },
    onSuccess: (mbe) => {
      writeStoredTargetStateCode(null);
      setStateCode(null);
      setCustomMbe(mbe);
      setDraftMbe(String(mbe));
      invalidate();
      toast.success(`Custom pass target set to ${mbe}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save custom target");
    },
  });

  const clearToNational = async () => {
    writeStoredTargetStateCode(null);
    setStateCode(null);
    setCustomMbe(NATIONAL_MBE_TARGET);
    setDraftMbe(String(NATIONAL_MBE_TARGET));
    setOpen(false);
    try {
      await patchTargetScore(ubeTargetFromMbe(NATIONAL_MBE_TARGET));
      invalidate();
      toast.success(
        `Target reset to ${NATIONAL_MBE_TARGET} (National Benchmark)`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset target"
      );
    }
  };

  const cardClass = compact
    ? "rounded-2xl border border-border bg-card p-4 shadow-sm"
    : "rounded-2xl border border-border bg-card p-6 shadow-sm";

  if (!data.unlocked) {
    const practicesLeft = Math.max(
      0,
      data.requiredDailyPractices - data.completedDailyPractices
    );
    const mocksLeft = Math.max(
      0,
      data.requiredMockExams - data.completedMockExams
    );

    return (
      <div className={cardClass}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Pass Probability
        </p>
        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h2
              className={
                compact
                  ? "text-2xl font-bold tracking-tight text-foreground"
                  : "text-3xl font-bold tracking-tight text-foreground md:text-4xl"
              }
            >
              Insufficient Data
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete at least {data.requiredDailyPractices} Daily Practices and{" "}
              {data.requiredMockExams} Full Mock Exam to unlock your pass
              probability and projected MBE.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>
                Daily Practices: {data.completedDailyPractices}/
                {data.requiredDailyPractices}
                {practicesLeft > 0 ? ` · ${practicesLeft} left` : " · Done"}
              </li>
              <li>
                Full Mock Exams: {data.completedMockExams}/
                {data.requiredMockExams}
                {mocksLeft > 0 ? ` · ${mocksLeft} left` : " · Done"}
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
              <Link href="/quest" className="text-primary hover:underline">
                Start Daily Practice →
              </Link>
              <Link href={MOCK_EXAM_ROUTE} className="text-primary hover:underline">
                Take Mock Exam →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const busy = saveStateMutation.isPending || saveCustomMutation.isPending;

  return (
    <div className={cardClass}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Pass Probability
      </p>
      <h2
        className={
          compact
            ? "mt-2 text-2xl font-bold tracking-tight text-foreground"
            : "mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl"
        }
      >
        {display.passProbability}% Pass Probability
      </h2>
      <p className="mt-2 text-sm italic text-muted-foreground">
        {data.summarySource}
      </p>

      <div className="relative mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left text-sm text-foreground"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span>{display.line}</span>
          <span className="mt-0.5 flex shrink-0 items-center gap-1 text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
            <ChevronDown
              className={cn("h-4 w-4 transition", open && "rotate-180")}
            />
          </span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <div className="border-b border-border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Pass target (MBE)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick your state cut score, or set a personal MBE goal (
                {MIN_CUSTOM_MBE_TARGET}–{MAX_CUSTOM_MBE_TARGET}).
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={MIN_CUSTOM_MBE_TARGET}
                  max={MAX_CUSTOM_MBE_TARGET}
                  value={draftMbe}
                  disabled={busy}
                  onChange={(e) => setDraftMbe(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveCustomMutation.mutate(Number(draftMbe));
                    }
                  }}
                  className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Custom MBE pass target"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveCustomMutation.mutate(Number(draftMbe))}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Save custom
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void clearToNational()}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                  National {NATIONAL_MBE_TARGET}
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto" role="listbox">
              <p className="sticky top-0 bg-card px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                By state
              </p>
              {TARGET_STATES.map((state) => (
                <button
                  key={state.code}
                  type="button"
                  role="option"
                  aria-selected={stateCode === state.code}
                  disabled={busy}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50",
                    stateCode === state.code && "bg-muted font-medium"
                  )}
                  onClick={() => saveStateMutation.mutate(state.code)}
                >
                  {state.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    Target {state.mbeTarget}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
