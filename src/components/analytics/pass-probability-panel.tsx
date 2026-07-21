"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  probabilityNearTarget,
  targetStateStatus,
  type PassProbabilityResult,
} from "@/lib/pass-probability";
import {
  getTargetState,
  readStoredTargetStateCode,
  TARGET_STATES,
  ubeTargetFromMbe,
  writeStoredTargetStateCode,
} from "@/lib/target-states";
import { cn } from "@/lib/utils";

type PassProbabilityPanelProps = {
  data: PassProbabilityResult;
  compact?: boolean;
};

export function PassProbabilityPanel({
  data,
  compact = false,
}: PassProbabilityPanelProps) {
  const queryClient = useQueryClient();
  const [stateCode, setStateCode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setStateCode(readStoredTargetStateCode());
  }, []);

  const selected = getTargetState(stateCode);

  const display = useMemo(() => {
    if (!selected) {
      return {
        passProbability: data.passProbability,
        statusLabel: null as string | null,
        line: (
          <>
            Your Projected MBE:{" "}
            <span className="font-semibold tabular-nums">{data.projectedMbe}</span>{" "}
            <span className="italic text-muted-foreground">
              (Select State to view target)
            </span>
          </>
        ),
      };
    }

    const status = targetStateStatus(data.projectedMbe, selected.mbeTarget);
    const passProbability = probabilityNearTarget(
      data.projectedMbe,
      selected.mbeTarget
    );

    return {
      passProbability,
      statusLabel: status,
      line: (
        <>
          Your Projected MBE:{" "}
          <span className="font-semibold tabular-nums">{data.projectedMbe}</span>
          {" / Target: "}
          <span className="font-semibold tabular-nums">{selected.mbeTarget}</span>
          {" "}
          <span className="text-muted-foreground">({selected.barLabel})</span>
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
  }, [data.passProbability, data.projectedMbe, selected]);

  const saveMutation = useMutation({
    mutationFn: async (code: string) => {
      const state = getTargetState(code);
      if (!state) throw new Error("Unknown state");
      const targetScore = ubeTargetFromMbe(state.mbeTarget);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetScore }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save target state");
      }
      return code;
    },
    onSuccess: (code) => {
      writeStoredTargetStateCode(code);
      setStateCode(code);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save target state");
    },
  });

  return (
    <div
      className={
        compact
          ? "border border-border bg-card p-4 shadow-sm"
          : "border border-border bg-card p-6 shadow-sm"
      }
    >
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
          aria-haspopup="listbox"
        >
          <span>{display.line}</span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
            role="listbox"
          >
            <button
              type="button"
              role="option"
              aria-selected={!stateCode}
              className="block w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => {
                writeStoredTargetStateCode(null);
                setStateCode(null);
                setOpen(false);
              }}
            >
              Clear selection
            </button>
            {TARGET_STATES.map((state) => (
              <button
                key={state.code}
                type="button"
                role="option"
                aria-selected={stateCode === state.code}
                disabled={saveMutation.isPending}
                className={cn(
                  "block w-full px-3 py-2 text-left text-sm hover:bg-muted",
                  stateCode === state.code && "bg-muted font-medium"
                )}
                onClick={() => saveMutation.mutate(state.code)}
              >
                {state.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  Target {state.mbeTarget}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
