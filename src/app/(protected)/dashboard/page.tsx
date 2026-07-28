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
import { DashboardCommandCenter } from "@/components/dashboard/command-center";
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
};

const MODES: ModeMeta[] = [
  {
    key: "lesson",
    title: "Structured lesson",
    desc: "A full lesson about this topic. Best for beginners — paced from first principles.",
    cta: "Start lesson",
  },
  {
    key: "practice",
    title: "Practice problems",
    desc: "Calibrated problems. Difficulty adapts as your accuracy stabilizes.",
    cta: "Solve problems",
  },
  {
    key: "chat",
    title: "Just chat",
    desc: "Open the floor. Ask anything, explore tangents, think out loud.",
    cta: "Get custom help",
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
    if (m === "chat") {
      router.push("/mentor");
      return;
    }
    setMode(m);
  }

  // 1 / 2 / 3 keyboard shortcuts on the mode picker.
  useEffect(() => {
    if (mode !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") handlePickMode("lesson");
      else if (e.key === "2") handlePickMode("practice");
      else if (e.key === "3") handlePickMode("chat");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const topics = (data?.topics ?? []).filter((t) => t.subject === subject);

  // SAT-style UX: auto-expand first topic when subject changes (like Algebra under Math).
  useEffect(() => {
    if (mode === null || mode === "chat") return;
    const filtered = (data?.topics ?? []).filter((t) => t.subject === subject);
    setExpandedTopicId(filtered.length > 0 ? filtered[0].id : null);
  }, [subject, mode, data?.topics]);

  return (
    <div className="dashboard-surface fixed inset-0 z-40 overflow-x-hidden overflow-y-auto pt-14 md:left-[15rem] md:pt-0">
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

      <div className="relative z-[2] mx-auto min-h-full w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait">
          {mode === null ? (
            <motion.div
              key="mode"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardCommandCenter
                firstName={firstName}
                accountability={accountability}
                accountabilityLoading={accountabilityLoading}
                onPickMode={handlePickMode}
              />
            </motion.div>
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
