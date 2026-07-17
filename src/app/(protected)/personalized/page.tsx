"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, Sparkles } from "lucide-react";
import type { Problem } from "@/components/quiz/types";
import {
  APP_BRANDING,
  MBE_SUBJECTS,
  type MbeSubject,
} from "@/lib/exam-config";

type SubtopicMatch = {
  topicSlug: string;
  topicName: string;
  subtopicSlug: string;
  subtopicName: string;
  subtopicId: string;
  weight: number;
  problemCount: number;
  rationale: string;
};

type Classification = {
  subject: MbeSubject;
  matches: SubtopicMatch[];
  notes: string | null;
};

type ApiResponse = {
  classification: Classification;
  problems: (Problem & { topicSlug: string; subtopicSlug: string })[];
};

export const PERSONALIZED_SESSION_KEY = "personalized:session:v2-mbe";

const EXAMPLE_PLAN = `Unit: Contract Formation
Students learn the elements of valid contract formation — offer, acceptance, and consideration.
Practice: identify valid offers, analyze acceptance methods (including mailbox rule), and spot missing consideration in short fact patterns.`;

const EXAMPLE_SLUGS = {
  topicSlug: "contracts",
  subtopicSlug: "formation-offer-acceptance-consideration",
} as const;

const MBE_SUBJECT_LABELS = MBE_SUBJECTS.map((s) => s.label).join(", ");

export default function PersonalizedPage() {
  const router = useRouter();
  const [plan, setPlan] = useState("");
  const [count, setCount] = useState<3 | 5 | 8>(5);
  const [loadingExample, setLoadingExample] = useState(false);

  const mutation = useMutation<
    ApiResponse,
    Error,
    { plan: string; count: number; topicSlug?: string; subtopicSlug?: string }
  >({
    mutationFn: async ({ plan, count, topicSlug, subtopicSlug }) => {
      const res = await fetch("/api/lesson-plan/practice-problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          count,
          ...(topicSlug && subtopicSlug ? { topicSlug, subtopicSlug } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.problems.length === 0) {
        toast.error("No matching bar exam topic found", {
          description:
            data.classification.notes ??
            "Name a bar exam skill from your notes (e.g. hearsay, negligence, contract formation). A general law overview won't match.",
          duration: 10000,
        });
        return;
      }
      sessionStorage.setItem(PERSONALIZED_SESSION_KEY, JSON.stringify(data));
      router.push("/personalized/quiz/1");
    },
    onError: (e) => {
      const msg = e.message || "Something went wrong";
      toast.error(
        msg.includes("Failed to classify")
          ? "Could not read your lesson plan. Try bar exam topics like Civil Procedure, Contracts, or Evidence."
          : msg
      );
    },
  });

  async function tryExample() {
    setPlan(EXAMPLE_PLAN);
    setLoadingExample(true);
    try {
      await mutation.mutateAsync({
        plan: EXAMPLE_PLAN,
        count,
        topicSlug: EXAMPLE_SLUGS.topicSlug,
        subtopicSlug: EXAMPLE_SLUGS.subtopicSlug,
      });
    } catch {
      // mutation.onError shows the toast
    } finally {
      setLoadingExample(false);
    }
  }

  function submit() {
    const trimmed = plan.trim();
    if (trimmed.length < 20) {
      toast.error("Paste at least a sentence or two of your lesson plan.");
      return;
    }
    const isExample = trimmed === EXAMPLE_PLAN.trim();
    mutation.mutate({
      plan: trimmed,
      count,
      ...(isExample ? EXAMPLE_SLUGS : {}),
    });
  }

  const phase: "input" | "loading" =
    mutation.isPending || loadingExample ? "loading" : "input";

  return (
    <div className="play-stage fixed inset-x-0 bottom-0 top-14 z-40 overflow-x-hidden overflow-y-auto md:left-[15rem] md:top-0">
      <div
        aria-hidden
        className="play-vignette pointer-events-none fixed inset-[-10%] z-0"
      />
      <div
        aria-hidden
        className="play-grain pointer-events-none fixed inset-0 z-[1]"
      />

      <div className="relative z-20 px-8 pt-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-xs uppercase tracking-[0.28em] text-[var(--p-fg-mute)] transition-colors hover:text-[var(--p-fg)]"
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          <ChevronLeft className="h-4 w-4" />
          BACK
        </button>
      </div>

      <div className="relative z-[2] mx-auto w-[min(820px,94vw)] px-6 py-10">
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <PlanInputView
              key="input"
              plan={plan}
              setPlan={setPlan}
              count={count}
              setCount={setCount}
              onSubmit={submit}
              onTryExample={tryExample}
              isBusy={mutation.isPending || loadingExample}
            />
          )}
          {phase === "loading" && <LoadingView key="loading" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlanInputView({
  plan,
  setPlan,
  count,
  setCount,
  onSubmit,
  onTryExample,
  isBusy,
}: {
  plan: string;
  setPlan: (v: string) => void;
  count: 3 | 5 | 8;
  setCount: (n: 3 | 5 | 8) => void;
  onSubmit: () => void;
  onTryExample: () => void;
  isBusy: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-8 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em]"
          style={{
            color: "var(--p-accent)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          <Sparkles className="h-3 w-3" />
          PERSONALIZED BAR EXAM PRACTICE
        </div>
        <h1
          className="text-[clamp(32px,4.2vw,48px)] tracking-[-0.01em]"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontWeight: 400,
            color: "var(--p-fg)",
          }}
        >
          <span className="italic" style={{ color: "var(--p-fg-dim)" }}>
            from your
          </span>{" "}
          bar prep notes
          <span style={{ color: "var(--p-accent)" }}>.</span>
        </h1>
        <p
          className="mt-2 max-w-lg text-sm leading-relaxed"
          style={{ color: "var(--p-fg-dim)" }}
        >
          Paste a syllabus excerpt, professor&apos;s notes, or study outline for{" "}
          <strong className="font-normal text-[var(--p-fg)]">
            {APP_BRANDING.examLabel}
          </strong>
          . We&apos;ll match it to bar exam topics and pull practice MCQs — same
          quiz experience you already know. Covers: {MBE_SUBJECT_LABELS}.
        </p>
      </div>

      <textarea
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        placeholder="Unit: Contract Formation. Students learn offer, acceptance, and consideration. Practice identifying valid offers and analyzing acceptance in fact patterns…"
        rows={10}
        className="w-full resize-y rounded-none px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus:border-[color:var(--p-accent)]"
        style={{
          background: "var(--p-surface)",
          border: "1px solid var(--p-rule)",
          color: "var(--p-fg)",
          fontFamily: "var(--font-jetbrains-mono)",
          caretColor: "var(--p-accent)",
        }}
      />

      <button
        type="button"
        onClick={onTryExample}
        disabled={isBusy}
        className="self-start text-[10px] uppercase tracking-[0.18em] transition-colors hover:text-[var(--p-accent)] disabled:opacity-40"
        style={{
          color: "var(--p-fg-mute)",
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        Try example → start practice
      </button>

      <div className="flex w-full items-center justify-between gap-4">
        <div
          className="flex gap-1 rounded-full p-1"
          style={{ border: "1px solid var(--p-rule)" }}
        >
          {[3, 5, 8].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n as 3 | 5 | 8)}
              className="rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                background:
                  n === count
                    ? "color-mix(in oklch, var(--p-accent) 22%, transparent)"
                    : "transparent",
                color: n === count ? "var(--p-fg)" : "var(--p-fg-mute)",
              }}
            >
              {n} problems
            </button>
          ))}
        </div>

        <button
          onClick={onSubmit}
          disabled={plan.trim().length < 20}
          className="flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: "#000",
            background: "var(--p-accent)",
            border: "1px solid var(--p-accent)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Start practice
        </button>
      </div>
    </motion.div>
  );
}

function LoadingView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[40vh] flex-col items-center justify-center gap-6"
    >
      <div className="relative h-14 w-14">
        <div
          aria-hidden
          className="absolute inset-0 animate-spin rounded-full"
          style={{
            border: "1px solid var(--p-rule)",
            borderTopColor: "var(--p-accent)",
            animationDuration: "1.2s",
          }}
        />
        <Sparkles
          className="absolute inset-0 m-auto h-5 w-5"
          style={{ color: "var(--p-accent)" }}
        />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="text-[10px] uppercase tracking-[0.28em]"
          style={{
            color: "var(--p-accent)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          READING YOUR PLAN
        </div>
        <div
          className="text-sm"
          style={{
            color: "var(--p-fg-dim)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          Matching bar exam topics · selecting problems
        </div>
      </div>
    </motion.div>
  );
}
