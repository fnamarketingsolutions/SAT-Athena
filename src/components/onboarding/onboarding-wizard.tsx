"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Calendar, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathContent } from "@/components/quiz/math-content";
import { BottomBar } from "@/components/quiz/bottom-bar";

type OnboardingStep =
  | "welcome"
  | "baseline"
  | "diagnostic"
  | "self_report"
  | "goals"
  | "schedule";

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

const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "baseline",
  "diagnostic",
  "self_report",
  "goals",
  "schedule",
];

function stepIndex(step: OnboardingStep) {
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

  const [step, setStep] = useState<OnboardingStep>("welcome");

  const [rwScore, setRwScore] = useState(500);
  const [mathScore, setMathScore] = useState(500);
  const [targetScore, setTargetScore] = useState(1200);

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
      setStep(saved as OnboardingStep);
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
    mutationFn: (next: OnboardingStep) =>
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
    (next: OnboardingStep) => {
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
      setTargetScore(Math.min(1600, scores.composite + 150));
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
      setTargetScore(Math.min(1600, scores.composite + 150));
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

  const currentComposite = resultScores?.composite ?? rwScore + mathScore;
  const minTarget = Math.min(1600, currentComposite + 50);

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
      <div className="play-stage flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[var(--p-accent)]" />
      </div>
    );
  }

  return (
    <div className="play-stage relative min-h-screen overflow-hidden">
      <div className="play-vignette pointer-events-none absolute inset-0" />
      <div className="play-grain pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-[var(--p-fg-mute)]">
            <span>Setup</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--p-rule)]">
            <div
              className="h-full bg-[var(--p-accent)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {step === "welcome" && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="play-anim-orb mx-auto mb-8">
              <div className="play-orb" />
            </div>
            <h1
              className="play-anim-h1 text-center font-[family-name:var(--font-instrument-serif)] text-4xl italic text-[var(--p-fg)] md:text-5xl"
              style={{ transform: "translateY(12px)" }}
            >
              {welcome ? "You're in." : "Welcome to Athena"}
            </h1>
            <p
              className="play-anim-sub mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-[var(--p-fg-dim)]"
              style={{ transform: "translateY(12px)" }}
            >
              A quick setup helps us calibrate your starting point, set a target score,
              and build a study schedule around your week.
            </p>
            <button
              onClick={() => goToStep("baseline")}
              className="play-card mx-auto mt-10 flex items-center gap-2 rounded-full border border-[var(--p-accent)]/40 bg-[var(--p-accent)]/10 px-8 py-3 text-sm font-medium text-[var(--p-accent)] transition hover:bg-[var(--p-accent)]/20"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "baseline" && (
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-[var(--p-fg)]">
              Where are you starting?
            </h2>
            <p className="mt-3 text-center text-sm text-[var(--p-fg-dim)]">
              Take a short diagnostic or enter scores you already know.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <button
                onClick={() => {
                  loadDiagnostic.mutate();
                }}
                disabled={loadDiagnostic.isPending}
                className="play-card rounded-2xl border border-[var(--p-rule)] p-6 text-left transition hover:border-[var(--p-accent)]/50"
              >
                <Sparkles className="mb-3 h-5 w-5 text-[var(--p-accent)]" />
                <div className="text-base font-medium text-[var(--p-fg)]">
                  {loadDiagnostic.isPending ? "Loading…" : "12-question diagnostic"}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--p-fg-mute)]">
                  ~10 minutes. We estimate your Reading & Writing and Math baselines.
                </p>
              </button>
              <button
                onClick={() => {
                  goToStep("self_report");
                }}
                className="play-card rounded-2xl border border-[var(--p-rule)] p-6 text-left transition hover:border-[var(--p-accent)]/50"
              >
                <Target className="mb-3 h-5 w-5 text-[var(--p-accent)]" />
                <div className="text-base font-medium text-[var(--p-fg)]">
                  I know my scores
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--p-fg-mute)]">
                  Enter your latest R&amp;W and Math section scores (200–800 each).
                </p>
              </button>
            </div>
          </div>
        )}

        {step === "self_report" && (
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-[var(--p-fg)]">
              Your current scores
            </h2>
            <div className="mt-10 space-y-8">
              <ScoreSlider
                label="Reading & Writing"
                value={rwScore}
                onChange={setRwScore}
              />
              <ScoreSlider label="Math" value={mathScore} onChange={setMathScore} />
              <p className="text-center text-sm text-[var(--p-fg-dim)]">
                Composite estimate: <span className="text-[var(--p-accent)]">{rwScore + mathScore}</span>
              </p>
            </div>
            <button
              onClick={() => submitBaseline.mutate()}
              disabled={submitBaseline.isPending}
              className="mx-auto mt-10 flex items-center gap-2 rounded-full border border-[var(--p-accent)]/40 bg-[var(--p-accent)]/10 px-8 py-3 text-sm font-medium text-[var(--p-accent)]"
            >
              {submitBaseline.isPending ? "Saving…" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "diagnostic" && currentProblem && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-6 text-center text-sm uppercase tracking-widest text-[var(--p-fg-mute)]">
              Diagnostic · Question {questionIndex + 1} of {diagnosticProblems.length}
            </h2>
            <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--p-rule)] bg-black/40 p-6">
              <div className="mb-4 text-xs text-[var(--p-fg-mute)]">{currentProblem.category}</div>
              <div className="text-[var(--p-fg)]">
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
                        ? "border-[var(--p-accent)] bg-[var(--p-accent)]/10 text-[var(--p-fg)]"
                        : "border-[var(--p-rule)] text-[var(--p-fg-dim)] hover:border-[var(--p-accent)]/40"
                    )}
                  >
                    <span className="font-mono text-[var(--p-fg-mute)]">
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
            <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-[var(--p-fg)]">
              Set your target score
            </h2>
            {resultScores && (
              <p className="mt-3 text-center text-sm text-[var(--p-fg-dim)]">
                Starting at {resultScores.composite} · R&amp;W {resultScores.rwScaled} · Math{" "}
                {resultScores.mathScaled}
              </p>
            )}
            <div className="mt-10">
              <ScoreSlider
                label="Target composite"
                value={targetScore}
                min={minTarget}
                max={1600}
                step={10}
                onChange={setTargetScore}
              />
            </div>
            <button
              onClick={() => goToStep("schedule")}
              className="mx-auto mt-10 flex items-center gap-2 rounded-full border border-[var(--p-accent)]/40 bg-[var(--p-accent)]/10 px-8 py-3 text-sm font-medium text-[var(--p-accent)]"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "schedule" && (
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="text-center font-[family-name:var(--font-instrument-serif)] text-3xl italic text-[var(--p-fg)]">
              When do you study?
            </h2>
            <p className="mt-3 text-center text-sm text-[var(--p-fg-dim)]">
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
                        ? "border-[var(--p-accent)] bg-[var(--p-accent)] text-black"
                        : "border-[var(--p-rule)] text-[var(--p-fg-mute)]"
                    )}
                  >
                    {day.letter}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 max-h-48 overflow-y-auto rounded-2xl border border-[var(--p-rule)] p-3">
              <div className="grid grid-cols-3 gap-2">
                {TIME_OPTIONS.filter((_, i) => i % 4 === 0).map((time) => (
                  <button
                    key={time.value}
                    onClick={() => setSelectedTime(time.value)}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-xs transition",
                      selectedTime === time.value
                        ? "border-[var(--p-accent)] bg-[var(--p-accent)]/10 text-[var(--p-accent)]"
                        : "border-[var(--p-rule)] text-[var(--p-fg-dim)]"
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
              className="mx-auto mt-10 flex items-center gap-2 rounded-full border border-[var(--p-accent)] bg-[var(--p-accent)] px-8 py-3 text-sm font-semibold text-black"
            >
              {completeOnboarding.isPending ? "Finishing…" : "Finish setup"}
              <Calendar className="h-4 w-4" />
            </button>
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
        <span className="text-[var(--p-fg-dim)]">{label}</span>
        <span className="font-mono text-[var(--p-accent)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--p-accent)]"
      />
      <div className="mt-1 flex justify-between text-xs text-[var(--p-fg-faint)]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
