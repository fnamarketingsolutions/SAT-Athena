"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Image as ImageIcon,
  Layers,
  Sparkles,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAccountabilityStatus } from "@/hooks/use-accountability-status";
import { DailyQuestHero } from "@/components/dashboard/daily-quest-hero";
import { cn } from "@/lib/utils";
import { MBE_SUBJECTS, type MbeSubject } from "@/lib/exam-config";

// ── Types ────────────────────────────────────────────────────────────
type Mode = "lesson" | "practice" | "chat";
type Subject = MbeSubject;

type Subtopic = {
  id: string;
  slug: string;
  name: string;
  difficulty: string | null;
  estimatedMinutes: number | null;
  description: string | null;
  lastVisitedAt: string | null;
  completed: boolean;
  stepsViewed: number | null;
  totalSteps: number | null;
};

function formatRelativeDay(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function progressPercent(viewed: number | null, total: number | null): number | null {
  if (!viewed || !total || total <= 0) return null;
  return Math.min(100, Math.round((viewed / total) * 100));
}

type Topic = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  overview: string | null;
  subtopics: Subtopic[];
};

// ── Modes ────────────────────────────────────────────────────────────
type ModeMeta = {
  key: Mode;
  title: string;
  desc: string;
  cta: string;
  Icon: () => React.ReactElement;
};

const MODES: ModeMeta[] = [
  {
    key: "lesson",
    title: "Structured lesson",
    desc: "A full lesson about this topic. Best for beginners — paced from first principles.",
    cta: "Start lesson",
    Icon: IconLesson,
  },
  {
    key: "practice",
    title: "Practice problems",
    desc: "Calibrated problems. Difficulty adapts as your accuracy stabilizes.",
    cta: "Solve problems",
    Icon: IconPractice,
  },
  {
    key: "chat",
    title: "Just chat",
    desc: "Open the floor. Ask anything, explore tangents, think out loud.",
    cta: "Get custom help",
    Icon: IconChat,
  },
];

const SUBJECTS = MBE_SUBJECTS;

function routeFor(mode: Mode, topicSlug: string, subtopicSlug: string) {
  switch (mode) {
    case "lesson":
      return `/learning/${topicSlug}/${subtopicSlug}/micro-lesson`;
    case "practice":
      return `/learning/${topicSlug}/${subtopicSlug}/quiz/1`;
    case "chat":
      return `/mentor`;
  }
}

// ── Page ─────────────────────────────────────────────────────────────
export default function PlayPage() {
  const router = useRouter();
  const { data: userData } = useCurrentUser();
  const { data: accountability, isLoading: accountabilityLoading } =
    useAccountabilityStatus();
  const questLocked = Boolean(accountability?.enabled && accountability.locked);
  const [mode, setMode] = useState<Mode | null>(null);
  const [subject, setSubject] = useState<Subject>("civil-procedure");
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<{ topics: Topic[] }>({
    queryKey: ["learning"],
    queryFn: () =>
      fetch("/api/learning").then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
    staleTime: 10 * 60_000,
    enabled: mode !== null && mode !== "chat",
  });

  useEffect(() => {
    if (isError) toast.error("Failed to load topics");
  }, [isError]);

  const firstName = useMemo(() => {
    const n = userData?.user?.displayName?.trim();
    if (!n) return null;
    return n.split(/\s+/)[0];
  }, [userData]);

  function handlePickMode(m: Mode) {
    if (questLocked) {
      toast.message("Complete today's practice first", {
        description: "Finish your daily practice session to open lessons and mentor chat.",
      });
      router.push("/quest");
      return;
    }
    if (m === "chat") {
      router.push("/mentor");
      return;
    }
    setMode(m);
  }

  useEffect(() => {
    if (questLocked && mode !== null) {
      setMode(null);
      setExpandedTopicId(null);
    }
  }, [questLocked, mode]);

  // 1 / 2 / 3 keyboard shortcuts on the mode picker.
  useEffect(() => {
    if (mode !== null || questLocked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") handlePickMode("lesson");
      else if (e.key === "2") handlePickMode("practice");
      else if (e.key === "3") handlePickMode("chat");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, questLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const topics = (data?.topics ?? []).filter((t) => t.subject === subject);

  // SAT-style UX: auto-expand first topic when subject changes (like Algebra under Math).
  useEffect(() => {
    if (mode === null || mode === "chat") return;
    const filtered = (data?.topics ?? []).filter((t) => t.subject === subject);
    setExpandedTopicId(filtered.length > 0 ? filtered[0].id : null);
  }, [subject, mode, data?.topics]);

  return (
    <div className="dashboard-surface fixed inset-0 z-50 overflow-x-hidden overflow-y-auto pt-14">
      {mode && (
        <div className="relative z-20 px-4 pt-4 sm:px-8 sm:pt-6">
          <button
            onClick={() => {
              setMode(null);
              setExpandedTopicId(null);
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      )}

      <div className="relative z-[2] mx-auto grid min-h-full w-full max-w-[1080px] place-items-center px-4 py-8 sm:px-6 sm:py-10 text-center">
        <AnimatePresence mode="wait">
          {mode === null ? (
            <ModePicker
              key="mode"
              onPick={handlePickMode}
              firstName={firstName}
              questLocked={questLocked}
              accountability={accountability}
              accountabilityLoading={accountabilityLoading}
            />
          ) : (
            <TopicPicker
              key="topic"
              mode={mode}
              subject={subject}
              onSubject={setSubject}
              topics={topics}
              isLoading={isLoading}
              expandedTopicId={expandedTopicId}
              setExpandedTopicId={setExpandedTopicId}
              onPick={(topicSlug, subtopicSlug) => {
                router.push(routeFor(mode, topicSlug, subtopicSlug));
              }}
              onPickPodcast={(subtopicId) =>
                router.push(`/podcast/${subtopicId}`)
              }
              onPickInfographic={(subtopicId) =>
                router.push(`/infographic/${subtopicId}`)
              }
              onPickFlashcards={(topicSlug, subtopicSlug) =>
                router.push(`/flashcards/${topicSlug}/${subtopicSlug}`)
              }
              onPickPersonalized={() => router.push("/personalized")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Mode picker ──────────────────────────────────────────────────────
function ModePicker({
  onPick,
  firstName,
  questLocked,
  accountability,
  accountabilityLoading,
}: {
  onPick: (m: Mode) => void;
  firstName: string | null;
  questLocked: boolean;
  accountability?: import("@/hooks/use-accountability-status").AccountabilityStatus;
  accountabilityLoading?: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-8 max-w-xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Welcome back
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-instrument-serif)] text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          {firstName ? (
            <>
              <span className="italic text-muted-foreground">Hi, </span>
              {firstName}
            </>
          ) : (
            "Your study plan"
          )}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {questLocked
            ? "Complete today's practice to continue with lessons and mentor chat."
            : "Choose how you want to study next."}
        </p>
      </div>

      <DailyQuestHero status={accountability} isLoading={accountabilityLoading} />

      <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <ModeCard key={m.key} mode={m} onPick={onPick} disabled={questLocked} />
        ))}
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  onPick,
  disabled = false,
}: {
  mode: ModeMeta;
  onPick: (m: Mode) => void;
  disabled?: boolean;
}) {
  const Icon = mode.Icon;
  return (
    <button
      type="button"
      onClick={() => !disabled && onPick(mode.key)}
      disabled={disabled}
      className={cn(
        "flex min-h-[220px] flex-col items-center rounded-2xl border border-border bg-card px-5 py-6 text-center shadow-sm transition",
        "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon />
      </div>
      <h3 className="font-[family-name:var(--font-instrument-serif)] text-2xl text-foreground">
        {mode.title}
      </h3>
      <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
        {mode.desc}
      </p>
      <span className="mt-auto pt-5 text-xs font-semibold uppercase tracking-wide text-primary">
        {mode.cta}
      </span>
    </button>
  );
}

// ── Topic picker ─────────────────────────────────────────────────────
function TopicPicker({
  mode,
  subject,
  onSubject,
  topics,
  isLoading,
  expandedTopicId,
  setExpandedTopicId,
  onPick,
  onPickPodcast,
  onPickInfographic,
  onPickFlashcards,
  onPickPersonalized,
}: {
  mode: Mode;
  subject: Subject;
  onSubject: (s: Subject) => void;
  topics: Topic[];
  isLoading: boolean;
  expandedTopicId: string | null;
  setExpandedTopicId: (id: string | null) => void;
  onPick: (topicSlug: string, subtopicSlug: string) => void;
  onPickPodcast: (subtopicId: string) => void;
  onPickInfographic: (subtopicId: string) => void;
  onPickFlashcards: (topicSlug: string, subtopicSlug: string) => void;
  onPickPersonalized: () => void;
}) {
  const modeMeta = MODES.find((m) => m.key === mode)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="flex w-full min-w-0 max-w-3xl flex-col items-center gap-6"
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className="text-[10px] uppercase tracking-[0.28em]"
          style={{
            color: "var(--p-accent)",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          {modeMeta.title}
        </div>
        <h2
          className="text-[clamp(28px,3.6vw,40px)] tracking-[-0.01em]"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            fontWeight: 400,
            color: "var(--p-fg)",
          }}
        >
          <span className="italic" style={{ color: "var(--p-fg-dim)" }}>
            pick
          </span>{" "}
          a topic
          <span style={{ color: "var(--p-accent)" }}>.</span>
        </h2>
      </div>

      {/* Subject toggle — scrollable pills (like MATH / READING & WRITING tabs) */}
      <div
        className="w-full overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        <div
          className="mx-auto flex w-max min-w-full justify-center gap-1 rounded-full p-1"
          style={{ border: "1px solid var(--p-rule)" }}
        >
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              onClick={() => onSubject(s.key)}
              title={s.label}
              className="shrink-0 rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors"
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                background:
                  s.key === subject
                    ? "color-mix(in oklch, var(--p-accent) 22%, transparent)"
                    : "transparent",
                color: s.key === subject ? "var(--p-fg)" : "var(--p-fg-mute)",
              }}
            >
              {s.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Personalized — only on practice mode. Sits above the canonical
          topic list because it skips topic/subtopic selection entirely:
          the student pastes a lesson plan and the classifier picks the
          subtopics. */}
      {mode === "practice" && (
        <button
          onClick={onPickPersonalized}
          className="group relative flex w-full items-center justify-between gap-4 overflow-hidden px-4 py-3.5 text-left transition-colors"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--p-accent) 14%, transparent) 0%, color-mix(in oklch, var(--p-accent) 4%, transparent) 60%, transparent 100%)",
            border: "1px solid color-mix(in oklch, var(--p-accent) 45%, var(--p-rule))",
          }}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "color-mix(in oklch, var(--p-accent) 18%, transparent)",
                border: "1px solid color-mix(in oklch, var(--p-accent) 55%, transparent)",
              }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "var(--p-accent)" }} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span
                  className="truncate text-[18px]"
                  style={{
                    fontFamily: "var(--font-instrument-serif)",
                    fontWeight: 400,
                    color: "var(--p-fg)",
                  }}
                >
                  Personalized
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    color: "var(--p-accent)",
                    background: "color-mix(in oklch, var(--p-accent) 14%, transparent)",
                    border: "1px solid color-mix(in oklch, var(--p-accent) 45%, transparent)",
                  }}
                >
                  NEW
                </span>
              </div>
              <div
                className="truncate text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: "var(--p-fg-mute)",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                Paste bar prep notes · we match bar exam topics
              </div>
            </div>
          </div>
          <ChevronRight
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: "var(--p-accent)" }}
          />
        </button>
      )}

      {/* Topic list */}
      <div className="flex w-full flex-col gap-2">
        {isLoading && (
          <div
            className="py-12 text-center text-[10px] uppercase tracking-[0.22em]"
            style={{
              color: "var(--p-fg-mute)",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            LOADING TOPICS…
          </div>
        )}
        {!isLoading && topics.length === 0 && (
          <div
            className="py-12 text-center text-[10px] uppercase tracking-[0.22em]"
            style={{
              color: "var(--p-fg-mute)",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            NO TOPICS AVAILABLE
          </div>
        )}
        {topics.map((topic) => {
          const isOpen = expandedTopicId === topic.id;
          return (
            <div
              key={topic.id}
              className="overflow-hidden"
              style={{
                background: "var(--p-surface)",
                border: "1px solid var(--p-rule)",
              }}
            >
              <button
                onClick={() => setExpandedTopicId(isOpen ? null : topic.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[color:var(--p-surface-hover)]"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div
                    className="truncate text-[18px]"
                    style={{
                      fontFamily: "var(--font-instrument-serif)",
                      fontWeight: 400,
                      color: "var(--p-fg)",
                    }}
                  >
                    {topic.name}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.18em]"
                    style={{
                      color: "var(--p-fg-mute)",
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    {topic.subtopics.length} subtopic
                    {topic.subtopics.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    isOpen && "rotate-90",
                  )}
                  style={{ color: "var(--p-fg-mute)" }}
                />
              </button>

              {isOpen && (
                <div
                  className="flex flex-col"
                  style={{ borderTop: "1px solid var(--p-rule)" }}
                >
                  {topic.subtopics.map((st, idx) => {
                    const lastVisited = formatRelativeDay(st.lastVisitedAt);
                    const pct = progressPercent(st.stepsViewed, st.totalSteps);
                    return (
                      <div
                        key={`${st.id}-${st.slug}-${idx}`}
                        className="group flex flex-col transition-colors hover:bg-[color:var(--p-surface-hover)] sm:flex-row sm:items-stretch"
                      >
                        <button
                          onClick={() => onPick(topic.slug, st.slug)}
                          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2.5 text-left sm:px-5"
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <div
                              className="truncate text-sm"
                              title={st.name}
                              style={{
                                color: "var(--p-fg)",
                                fontFamily: "var(--font-jetbrains-mono)",
                              }}
                            >
                              {st.name}
                            </div>
                            <div
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.18em]"
                              style={{
                                color: "var(--p-fg-mute)",
                                fontFamily: "var(--font-jetbrains-mono)",
                              }}
                            >
                              {st.difficulty && <span>{st.difficulty}</span>}
                              {st.estimatedMinutes != null && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {st.estimatedMinutes}m
                                </span>
                              )}
                              {st.completed ? (
                                <span
                                  className="flex items-center gap-1"
                                  style={{ color: "var(--p-accent)" }}
                                >
                                  <span
                                    aria-hidden
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: "var(--p-accent)" }}
                                  />
                                  Completed{lastVisited ? ` · ${lastVisited}` : ""}
                                </span>
                              ) : pct != null ? (
                                <span className="flex items-center gap-1">
                                  <span
                                    aria-hidden
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: "var(--p-fg-mute)" }}
                                  />
                                  {pct}%{lastVisited ? ` · ${lastVisited}` : ""}
                                </span>
                              ) : lastVisited ? (
                                <span>Opened {lastVisited}</span>
                              ) : null}
                            </div>
                          </div>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 transition-colors"
                            style={{ color: "var(--p-fg-mute)" }}
                          />
                        </button>
                        <div
                          className="flex shrink-0 border-t sm:border-t-0 sm:border-l"
                          style={{ borderColor: "var(--p-rule)" }}
                        >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPickPodcast(st.id);
                          }}
                          aria-label={`Listen to a podcast about ${st.name}`}
                          title="Listen to podcast"
                          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors hover:text-[color:var(--p-accent)] sm:flex-none sm:px-4 sm:py-0"
                          style={{
                            borderColor: "var(--p-rule)",
                            color: "var(--p-fg-mute)",
                            fontFamily: "var(--font-jetbrains-mono)",
                          }}
                        >
                          <Headphones className="h-3 w-3" />
                          <span className="hidden sm:inline">Podcast</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPickInfographic(st.id);
                          }}
                          aria-label={`See an infographic about ${st.name}`}
                          title="See infographic"
                          className="flex flex-1 items-center justify-center gap-1.5 border-l px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors hover:text-[color:var(--p-accent)] sm:flex-none sm:px-4 sm:py-0"
                          style={{
                            borderColor: "var(--p-rule)",
                            color: "var(--p-fg-mute)",
                            fontFamily: "var(--font-jetbrains-mono)",
                          }}
                        >
                          <ImageIcon className="h-3 w-3" />
                          <span className="hidden sm:inline">Poster</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPickFlashcards(topic.slug, st.slug);
                          }}
                          aria-label={`Build a flashcard deck about ${st.name}`}
                          title="Build a flashcard deck"
                          className="flex flex-1 items-center justify-center gap-1.5 border-l px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors hover:text-[color:var(--p-accent)] sm:flex-none sm:px-4 sm:py-0"
                          style={{
                            borderColor: "var(--p-rule)",
                            color: "var(--p-fg-mute)",
                            fontFamily: "var(--font-jetbrains-mono)",
                          }}
                        >
                          <Layers className="h-3 w-3" />
                          <span className="hidden sm:inline">Cards</span>
                        </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Animated SVG icons ────────────────────────────────────────────────

function IconLesson() {
  return (
    <svg viewBox="0 0 72 72" className="h-full w-full overflow-visible">
      <path d="M8 18 L36 24 L36 60 L8 54 Z" stroke="var(--p-fg-dim)" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M64 18 L36 24 L36 60 L64 54 Z" stroke="var(--p-fg-dim)" strokeWidth="1" strokeLinecap="round" fill="none" />
      <line x1="36" y1="24" x2="36" y2="60" stroke="var(--p-fg-faint)" strokeWidth="1" strokeLinecap="round" />
      <line x1="14" y1="32" x2="30" y2="35" stroke="var(--p-fg-faint)" strokeWidth="1" strokeLinecap="round" />
      <line x1="14" y1="38" x2="30" y2="41" stroke="var(--p-fg-faint)" strokeWidth="1" strokeLinecap="round" />
      <line x1="14" y1="44" x2="26" y2="46.5" stroke="var(--p-fg-faint)" strokeWidth="1" strokeLinecap="round" />
      <line x1="42" y1="35" x2="58" y2="32" stroke="var(--p-fg-faint)" strokeWidth="1" strokeLinecap="round" />
      <line x1="42" y1="41" x2="58" y2="38" stroke="var(--p-fg-faint)" strokeWidth="1" strokeLinecap="round" />
      <line x1="42" y1="46.5" x2="54" y2="44" stroke="var(--p-fg-faint)" strokeWidth="1" strokeLinecap="round" />
      <g className="page-turn">
        <path d="M36 24 Q 50 16, 62 22 L 62 56 Q 50 50, 36 58 Z" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" strokeLinecap="round" fill="var(--p-bg)" />
        <line x1="42" y1="30" x2="56" y2="27" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" strokeLinecap="round" />
        <line x1="42" y1="36" x2="56" y2="33" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" strokeLinecap="round" />
        <line x1="42" y1="42" x2="52" y2="40" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle className="book-glint" cx="36" cy="22" r="1.6" fill="var(--accent-stroke,var(--p-accent-deep))" />
    </svg>
  );
}

function IconPractice() {
  return (
    <svg viewBox="0 0 72 72" className="h-full w-full overflow-visible">
      <g className="pulse-ring">
        <circle cx="36" cy="36" r="30" stroke="var(--p-fg-faint)" strokeWidth="1" fill="none" />
      </g>
      <circle cx="36" cy="36" r="22" stroke="var(--p-fg-dim)" strokeWidth="1" fill="none" />
      <circle cx="36" cy="36" r="13" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" fill="none" />
      <g className="scan">
        <line x1="36" y1="36" x2="36" y2="14" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" strokeDasharray="2 3" />
      </g>
      <line x1="6" y1="36" x2="14" y2="36" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" />
      <line x1="58" y1="36" x2="66" y2="36" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" />
      <line x1="36" y1="6" x2="36" y2="14" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" />
      <line x1="36" y1="58" x2="36" y2="66" stroke="var(--accent-stroke,var(--p-accent-deep))" strokeWidth="1" />
      <g className="hit">
        <circle cx="36" cy="36" r="3" fill="var(--accent-stroke,var(--p-accent-deep))" />
      </g>
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 72 72" className="h-full w-full overflow-visible">
      <path
        d="M14 16 L52 16 Q60 16 60 24 L60 42 Q60 50 52 50 L34 50 L26 58 L26 50 L22 50 Q14 50 14 42 Z"
        stroke="var(--p-fg-faint)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10 12 L48 12 Q56 12 56 20 L56 38 Q56 46 48 46 L30 46 L22 54 L22 46 L18 46 Q10 46 10 38 Z"
        stroke="var(--accent-stroke,var(--p-accent-deep))"
        strokeWidth="1"
        strokeLinecap="round"
        fill="var(--p-bg)"
      />
      <circle className="chat-dot d1" cx="22" cy="29" r="2.6" fill="var(--accent-stroke,var(--p-accent-deep))" />
      <circle className="chat-dot d2" cx="33" cy="29" r="2.6" fill="var(--accent-stroke,var(--p-accent-deep))" />
      <circle className="chat-dot d3" cx="44" cy="29" r="2.6" fill="var(--accent-stroke,var(--p-accent-deep))" />
    </svg>
  );
}
