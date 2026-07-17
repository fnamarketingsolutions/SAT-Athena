"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Calendar, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathContent } from "@/components/quiz/math-content";
import { BottomBar } from "@/components/quiz/bottom-bar";
import type { OnboardingStep } from "@/lib/db/queries/onboarding";
import { DEFAULT_UBE_TARGET } from "@/lib/pass-probability";

type WizardStep = Exclude<OnboardingStep, "done">;

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type DiagnosticProblem = {
  id: string;
  orderIndex: number;
  category: string;
  difficulty: string;
  questionText: string;
  options: string[];
};

type OnboardingState = {
  completed: boolean;
  progress: {
    currentStep: OnboardingStep;
    quizQuestionIndex: number;
  } | null;
  scores: {
    targetScore: number | null;
    currentComposite: number | null;
    currentReadingWriting: number | null;
    currentMath: number | null;
  };
};

const DAY_LETTERS: { key: DayOfWeek; letter: string }[] = [
  { key: "monday", letter: "M" },
  { key: "tuesday", letter: "T" },
  { key: "wednesday", letter: "W" },
  { key: "thursday", letter: "T" },
  { key: "friday", letter: "F" },
  { key: "saturday", letter: "S" },
  { key: "sunday", letter: "S" },
];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:${String(minute).padStart(2, "0")} ${period}`;
}

function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      options.push({ value, label: formatTime(h, m) });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const STEP_ORDER: WizardStep[] = [
  "welcome",
  "baseline",
  "diagnostic",
  "self_report",
  "goals",
  "schedule",
];

function stepIndex(step: WizardStep) {
  if (step === "diagnostic" || step === "self_report") return 2;
  return STEP_ORDER.indexOf(step);
}

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const welcome = searchParams.get("welcome") === "1";

  const { data, isLoading } = useQuery<OnboardingState>({
    queryKey: ["onboarding"],
    queryFn: () =>
      fetch("/api/onboarding").then((r) => {
        if (!r.ok) throw new Error("Failed to load onboarding");
        return r.json();
      }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [step, setStep] = useState<WizardStep>("welcome");

  const [rwScore, setRwScore] = useState(500);
  const [mathScore, setMathScore] = useState(500);
  const [targetScore, setTargetScore] = useState(DEFAULT_UBE_TARGET);

  const [activeDays, setActiveDays] = useState<Set<DayOfWeek>>(new Set(["monday", "wednesday", "friday"]));
  const [selectedTime, setSelectedTime] = useState("18:00");

  const [diagnosticProblems, setDiagnosticProblems] = useState<DiagnosticProblem[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | undefined>();
  const [diagnosticStartedAt, setDiagnosticStartedAt] = useState<number | null>(null);
  const [resultScores, setResultScores] = useState<{
    composite: number;
    rwScaled: number;
    mathScaled: number;
  } | null>(null);

  useEffect(() => {
    if (!data || data.completed) return;
    const saved = data.progress?.currentStep;
    if (saved && saved !== "done") {
      setStep(saved);
    }
    if (data.scores.currentReadingWriting) setRwScore(data.scores.currentReadingWriting);
    if (data.scores.currentMath) setMathScore(data.scores.currentMath);
    if (data.scores.targetScore) setTargetScore(data.scores.targetScore);
    if (data.scores.currentComposite) {
      setResultScores({
        composite: data.scores.currentComposite,
        rwScaled: data.scores.currentReadingWriting ?? 400,
        mathScaled: data.scores.currentMath ?? 400,
      });
    }
  }, [data]);

  const saveStep = useMutation({
    mutationFn: (next: WizardStep) =>
      fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: next }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to save progress");
        return r.json();
      }),
  });

  const goToStep = useCallback(
    (next: WizardStep) => {
      setStep(next);
      saveStep.mutate(next);
    },
    [saveStep]
  );

  const loadDiagnostic = useMutation({
    mutationFn: () =>
      fetch("/api/onboarding/diagnostic").then((r) => {
        if (!r.ok) throw new Error("Failed to load diagnostic");
        return r.json() as Promise<{ problems: DiagnosticProblem[] }>;
      }),
    onSuccess: (payload) => {
      setDiagnosticProblems(payload.problems);
      setQuestionIndex(0);
      setAnswers({});
      setSelectedOption(undefined);
      setDiagnosticStartedAt(Date.now());
      goToStep("diagnostic");
    },
    onError: () => toast.error("Could not load diagnostic questions"),
  });

  const submitDiagnostic = useMutation({
    mutationFn: (payload: { answers: { problemId: string; selectedOption: number }[]; timeElapsedSeconds: number }) =>
      fetch("/api/onboarding/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to submit diagnostic");
        return r.json();
      }),
    onSuccess: (scores) => {
      setResultScores({
        composite: scores.composite,
        rwScaled: scores.rwScaled,
        mathScaled: scores.mathScaled,
      });
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      goToStep("goals");
      toast.success("Diagnostic complete!");
    },
    onError: () => toast.error("Failed to save diagnostic results"),
  });

  const submitBaseline = useMutation({
    mutationFn: () =>
      fetch("/api/onboarding/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingWriting: rwScore, math: mathScore }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to save baseline");
        return r.json();
      }),
    onSuccess: (scores) => {
      setResultScores({
        composite: scores.composite,
        rwScaled: scores.rw,
        mathScaled: scores.math,
      });
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      goToStep("goals");
    },
    onError: () => toast.error("Failed to save scores"),
  });

  const completeOnboarding = useMutation({
    mutationFn: () => {
      const slots = Array.from(activeDays).map((day) => ({
        dayOfWeek: day,
        startTime: selectedTime,
        endTime: addHour(selectedTime),
      }));
      return fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetScore,
          slots,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to complete onboarding");
        return r.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      router.push("/quest");
    },
    onError: () => toast.error("Failed to finish setup"),
  });

  const progressPct = useMemo(() => {
    const idx = stepIndex(step);
    return Math.round(((idx + 1) / 5) * 100);
  }, [step]);

  const currentProblem = diagnosticProblems[questionIndex];

  const handleDiagnosticNext = () => {
    if (selectedOption === undefined || !currentProblem) return;
    const nextAnswers = { ...answers, [currentProblem.id]: selectedOption };
    setAnswers(nextAnswers);

    if (questionIndex < diagnosticProblems.length - 1) {
      const nextIdx = questionIndex + 1;
      setQuestionIndex(nextIdx);
      setSelectedOption(nextAnswers[diagnosticProblems[nextIdx].id]);
      return;
    }

    const elapsed = diagnosticStartedAt
      ? Math.round((Date.now() - diagnosticStartedAt) / 1000)
      : 0;
    submitDiagnostic.mutate({
      answers: Object.entries(nextAnswers).map(([problemId, selectedOption]) => ({
        problemId,
        selectedOption,
      })),
      timeElapsedSeconds: elapsed,
    });
  };

  if (isLoading) {
    return (
      <div className="onboarding-surface flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="onboarding-surface relative min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <span>Setup</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {step === "welcome" && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
              <h1 className="text-center font-[family-name:var(--font-instrument-serif)] text-4xl italic text-foreground md:text-5xl">
                {welcome ? "You're in." : "Welcome to Athena"}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              A quick setup helps us calibrate your starting point, set a target
              score, and build a study schedule around your week.
              </p>
              <button
                onClick={() => goToStep("baseline")}
                className="mx-auto mt-10 flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "baseline" && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
              <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-foreground">
                Where are you starting?
              </h2>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Take a short diagnostic or enter scores you already know.
              </p>
              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    loadDiagnostic.mutate();
                  }}
                  disabled={loadDiagnostic.isPending}
                  className="rounded-2xl border border-border bg-background p-6 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <Sparkles className="mb-3 h-5 w-5 text-primary" />
                  <div className="text-base font-medium text-foreground">
                    {loadDiagnostic.isPending ? "Loading…" : "12-question diagnostic"}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    ~10 minutes. We estimate your Reading & Writing and Math baselines.
                  </p>
                </button>
                <button
                  onClick={() => {
                    goToStep("self_report");
                  }}
                  className="rounded-2xl border border-border bg-background p-6 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <Target className="mb-3 h-5 w-5 text-primary" />
                  <div className="text-base font-medium text-foreground">
                    I know my scores
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Enter your latest R&amp;W and Math section scores (200–800 each).
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "self_report" && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
              <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-foreground">
                Your current scores
              </h2>
              <div className="mt-10 space-y-8">
                <ScoreSlider
                  label="Reading & Writing"
                  value={rwScore}
                  onChange={setRwScore}
                />
                <ScoreSlider label="Math" value={mathScore} onChange={setMathScore} />
                <p className="text-center text-sm text-muted-foreground">
                  Composite estimate:{" "}
                  <span className="font-medium text-primary">{rwScore + mathScore}</span>
                </p>
              </div>
              <button
                onClick={() => submitBaseline.mutate()}
                disabled={submitBaseline.isPending}
                className="mx-auto mt-10 flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {submitBaseline.isPending ? "Saving…" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "diagnostic" && currentProblem && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Diagnostic · Question {questionIndex + 1} of {diagnosticProblems.length}
            </h2>
            <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 text-xs text-muted-foreground">{currentProblem.category}</div>
              <div className="text-foreground">
                <MathContent content={currentProblem.questionText} />
              </div>
              <div className="mt-6 space-y-2">
                {currentProblem.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOption(i)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                      selectedOption === i
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/40"
                    )}
                  >
                    <span className="font-mono text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <MathContent content={option} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <BottomBar
                currentIndex={questionIndex}
                total={diagnosticProblems.length}
                unansweredCount={diagnosticProblems.length - Object.keys(answers).length - (selectedOption !== undefined ? 1 : 0)}
                onBack={() => {
                  if (questionIndex > 0) {
                    const prev = questionIndex - 1;
                    setQuestionIndex(prev);
                    setSelectedOption(answers[diagnosticProblems[prev].id]);
                  }
                }}
                onNext={handleDiagnosticNext}
                onGoTo={() => {}}
                onSubmit={() => {}}
                getStatus={() => "answered"}
                sequential
                nextDisabled={selectedOption === undefined || submitDiagnostic.isPending}
                onFinish={handleDiagnosticNext}
              />
            </div>
          </div>
        )}

        {step === "goals" && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
              <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-foreground">
                Set your target score
              </h2>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                This is the UBE-style total score you are aiming for. Pass
                Probability uses it as the benchmark for your projected MBE.
              </p>
              <div className="mx-auto mt-10 max-w-md">
                <div className="flex items-end justify-center gap-2">
                  <span className="text-5xl font-bold tabular-nums text-foreground">
                    {targetScore}
                  </span>
                  <Target className="mb-2 h-5 w-5 text-primary" />
                </div>
                <input
                  type="range"
                  min={220}
                  max={330}
                  step={2}
                  value={targetScore}
                  onChange={(e) => setTargetScore(Number(e.target.value))}
                  className="mt-8 w-full accent-primary"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>220</span>
                  <span>330</span>
                </div>
              </div>
              <button
                onClick={() => goToStep("schedule")}
                className="mx-auto mt-10 flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "schedule" && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
              <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-foreground">
                When do you study?
              </h2>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Pick the days and time for your weekly sessions. You can change this later.
              </p>

              <div className="mt-8 flex justify-center gap-2">
                {DAY_LETTERS.map((day) => {
                  const isActive = activeDays.has(day.key);
                  return (
                    <button
                      key={day.key}
                      onClick={() => {
                        setActiveDays((prev) => {
                          const next = new Set(prev);
                          if (next.has(day.key)) next.delete(day.key);
                          else next.add(day.key);
                          return next;
                        });
                      }}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition",
                        isActive
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {day.letter}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 max-h-48 overflow-y-auto rounded-2xl border border-border bg-background p-3">
                <div className="grid grid-cols-3 gap-2">
                  {TIME_OPTIONS.filter((_, i) => i % 4 === 0).map((time) => (
                    <button
                      key={time.value}
                      onClick={() => setSelectedTime(time.value)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs transition",
                        selectedTime === time.value
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (activeDays.size === 0) {
                    toast.error("Select at least one study day");
                    return;
                  }
                  completeOnboarding.mutate();
                }}
                disabled={completeOnboarding.isPending}
                className="mx-auto mt-10 flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {completeOnboarding.isPending ? "Finishing…" : "Finish setup"}
                <Calendar className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreSlider({
  label,
  value,
  onChange,
  min = 200,
  max = 800,
  step = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground/70">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
