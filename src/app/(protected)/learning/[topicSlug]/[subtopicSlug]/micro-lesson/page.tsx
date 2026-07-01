"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { MicroLesson } from "@/components/learning/micro-lesson";
import { getWrapUp } from "@/lib/wrap-ups";
import { WhiteboardSkeleton } from "@/components/whiteboard/whiteboard-skeleton";
import { GenerationProgress } from "@/components/lessons/generation-progress";

function MicroLessonPageInner() {
  const params = useParams<{ topicSlug: string; subtopicSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // debug flags can be comma-combined, e.g. ?debug=ops,freeze
  const debugFlags = new Set((searchParams.get("debug") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const debugOps = debugFlags.has("ops");
  const freezeCanvas = debugFlags.has("freeze");
  const debugScrub = debugFlags.has("scrub");
  const noirCanvas = debugFlags.has("v2");
  const corkboardCanvas = debugFlags.has("v3");
  const debugOrb = debugFlags.has("orb");
  const { topicSlug, subtopicSlug } = params;

  // Once we start generating locally, stop polling so the refetch
  // doesn't unmount MicroLesson by switching to the "generating" spinner.
  const generatingLocallyRef = useRef(false);

  // Force dark mode on <html> for this route so the whiteboard's
  // useIsDarkMode() hook activates and its elements adapt their colors.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    if (!hadDark) root.classList.add("dark");
    return () => {
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  // Opt-in: ?debug=ops paints dashed outlines around the four op-* roles
  // the AI tagged on LaTeX spans. Only active while the URL has the flag.
  useEffect(() => {
    if (!debugOps) return;
    const root = document.documentElement;
    root.classList.add("debug-ops");
    return () => {
      root.classList.remove("debug-ops");
    };
  }, [debugOps]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const {
    data,
    isLoading: metaLoading,
    isError: metaError,
  } = useQuery({
    queryKey: ["learning", topicSlug, subtopicSlug],
    queryFn: () =>
      fetch(`/api/learning/${topicSlug}/${subtopicSlug}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
    staleTime: 600_000,
    // Static topic/subtopic metadata — no need to refetch on focus, and it
    // keeps the lesson page from re-rendering mid-lesson on tab switches.
    refetchOnWindowFocus: false,
  });

  const {
    data: storedLesson,
    isLoading: lessonLoading,
    isError: lessonError,
  } = useQuery({
    queryKey: ["micro-lesson", topicSlug, subtopicSlug],
    queryFn: () =>
      fetch(`/api/learning/${topicSlug}/${subtopicSlug}/micro-lesson`).then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
    staleTime: 0,
    // Do NOT refetch when the window regains focus. With staleTime:0 a focus
    // refetch hands MicroLesson a fresh whiteboardSteps/existingLesson object
    // mid-lesson, which remounts the step player — skipping questions to the
    // done/practice view and resetting the practice-problem fetch. Generation
    // polling is unaffected (it uses refetchInterval below, not focus).
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (generatingLocallyRef.current) return false;
      return query.state.data?.status === "generating" ? 3000 : false;
    },
  });

  useEffect(() => {
    if (metaError) toast.error("Failed to load subtopic");
  }, [metaError]);

  useEffect(() => {
    if (lessonError) toast.error("Failed to load lesson");
  }, [lessonError]);

  if (metaLoading || lessonLoading) {
    return (
      <div className="dark fixed inset-x-0 top-14 z-30 flex h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden observation-record">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--obs-border)] border-t-[var(--obs-glow-mid)]" />
      </div>
    );
  }

  if (!data) return null;

  // Another client is currently generating — show polling spinner
  // (but not if we're the one generating)
  if (storedLesson?.status === "generating" && !generatingLocallyRef.current) {
    return (
      <div className="dark fixed inset-x-0 top-14 z-30 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden observation-record">
        <div className="flex items-center justify-center py-6">
          <GenerationProgress />
        </div>
        <div className="min-h-0 flex-1">
          <WhiteboardSkeleton className="h-full" />
        </div>
      </div>
    );
  }

  const { topic, subtopic } = data;
  const lessonSubject =
    topic.subject === "reading-writing" ? "reading-writing" : "math";
  const useCorkboard =
    lessonSubject === "reading-writing" || corkboardCanvas;

  // Silent, caption-free wrap-up video + its narration timeline (spoken
  // live in the chosen tutor voice). See src/lib/wrap-ups.ts.
  const wrapUp = getWrapUp(subtopicSlug);

  // Determine existing lesson: ready rows pass content; null/stale/error → generate
  const existingLesson =
    storedLesson?.status === "ready"
      ? { lessonContent: storedLesson.lessonContent, whiteboardSteps: storedLesson.whiteboardSteps }
      : null;

  // If no existing lesson, we'll generate locally — stop polling
  if (!existingLesson) {
    generatingLocallyRef.current = true;
  }

  return (
    <MicroLesson
      topic={topic.name}
      subtopic={subtopic.name}
      metadata={{
        description: subtopic.description,
        learningObjectives: subtopic.learningObjectives,
        keyFormulas: subtopic.keyFormulas,
        commonMistakes: subtopic.commonMistakes,
        tipsAndTricks: subtopic.tipsAndTricks,
        conceptualOverview: subtopic.conceptualOverview,
      }}
      existingLesson={existingLesson}
      subtopicApiPath={`/api/learning/${topicSlug}/${subtopicSlug}/micro-lesson`}
      practiceMode={{ subject: lessonSubject }}
      wrapUpVideoUrl={wrapUp?.videoUrl}
      wrapUpNarration={wrapUp?.beats}
      ambientMusicUrl="/audio/lesson-ambient.mp3"
      onClose={() => router.push("/dashboard")}
      tracking={storedLesson?.id ? { microLessonId: storedLesson.id, subtopicId: storedLesson.subtopicId ?? data.subtopic.id } : undefined}
      freezeCanvas={freezeCanvas}
      debugScrub={debugScrub}
      noirCanvas={noirCanvas}
      corkboardCanvas={useCorkboard}
      caseLabel={`${topic.name} / ${subtopic.name}`}
      debugOrb={debugOrb}
    />
  );
}

export default function MicroLessonPage() {
  return (
    <Suspense
      fallback={
        <div className="dark fixed inset-x-0 top-14 z-30 flex h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden observation-record">
          <WhiteboardSkeleton />
        </div>
      }
    >
      <MicroLessonPageInner />
    </Suspense>
  );
}
