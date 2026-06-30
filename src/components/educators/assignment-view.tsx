"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  SignedIn,
  SignedOut,
  SignInButton,
} from "@/components/auth/components";
import { useAuthUser } from "@/components/auth/auth-context";
import {
  CalendarDays,
  Sparkles,
  Loader2,
  ExternalLink,
  Send,
  CheckCircle2,
  PencilLine,
  Camera,
  X,
  LogIn,
  GraduationCap,
} from "lucide-react";
import { MathContent } from "@/components/quiz/math-content";
import {
  assembleQuizResponse,
  formatLongDate,
  isPublicFreeResponse,
  OPTION_LETTERS,
} from "@/lib/educators";
import type {
  PublicAssignmentQuestion,
  PublicFreeResponseQuestion,
  PublicQuizQuestion,
} from "@/lib/db/queries/educators";

type PublicAssignment = {
  id: string;
  title: string;
  instructions: string;
  dueDate: string;
  questions: PublicQuizQuestion[] | null;
};

type SubmitResult = {
  ok: boolean;
  studentName: string;
  graded?: { grade: number | null; correctCount: number; total: number };
};

type WorkPhoto = {
  /** base64 without the data: prefix */
  data: string;
  mediaType: string;
  /** object URL for the preview thumbnail */
  previewUrl: string;
};

const MAX_PHOTOS = 3;

/** Downscale a camera photo to ≤1600px JPEG so submissions stay small.
 *  Falls back to the original file when decoding fails. */
async function fileToWorkPhoto(file: File): Promise<WorkPhoto> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const [, data] = dataUrl.split(",");
    return {
      data,
      mediaType: "image/jpeg",
      previewUrl: dataUrl,
    };
  } catch {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const [meta, data] = dataUrl.split(",");
    return {
      data,
      mediaType: meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg",
      previewUrl: dataUrl,
    };
  }
}

// Split instructions into readable blocks; auto-link URLs.
const URL_RE = /(https?:\/\/[^\s)]+)/g;

const renderLine = (line: string, key: number) => {
  const parts = line.split(URL_RE);
  return (
    <span key={key}>
      {parts.map((p, i) =>
        // split() with a capture group puts URL matches at odd indices; a
        // stateless check avoids the global-regex lastIndex pitfall.
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            {p}
            <ExternalLink size={11} />
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
};

export function AssignmentView({ assignmentId }: { assignmentId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["educator", "public-assignment", assignmentId],
    queryFn: async (): Promise<{ assignment: PublicAssignment | null }> => {
      const r = await fetch(`/api/educators/assignments/${assignmentId}`);
      if (r.status === 404) return { assignment: null };
      if (!r.ok) throw new Error("Failed to load assignment");
      return r.json();
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const a = data?.assignment ?? null;

  useEffect(() => {
    if (a) document.title = a.title;
  }, [a]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground/60">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  if (isError || !a) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="font-mono-hud hud-dim mb-2 text-[12px] tracking-[0.25em]">
            404
          </div>
          <h1 className="text-xl text-foreground">Assignment not found</h1>
        </div>
      </div>
    );
  }

  // Group consecutive non-empty lines into paragraphs.
  const blocks: string[][] = [];
  let cur: string[] = [];
  a.instructions.split("\n").forEach((ln) => {
    if (ln.trim() === "") {
      if (cur.length) blocks.push(cur);
      cur = [];
    } else cur.push(ln);
  });
  if (cur.length) blocks.push(cur);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
        {/* Header */}
        <div className="mb-10">
          <div className="font-mono-hud hud-dim mb-4 flex items-center gap-2 text-[12px] tracking-[0.3em]">
            <Sparkles size={13} /> HOMEWORK
          </div>
          <h1 className="text-4xl font-light leading-tight tracking-tight sm:text-5xl">
            {a.title}
          </h1>
          <div className="font-mono-hud hud-dim mt-5 flex flex-wrap items-center gap-4 text-[12px]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} />
              Due {formatLongDate(a.dueDate)}
            </span>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

        {/* Body */}
        <article className="mt-10 space-y-5 text-[15.5px] leading-relaxed text-foreground/90">
          {blocks.map((blk, bi) => (
            <p key={bi} className="whitespace-pre-line">
              {blk.map((ln, li) => (
                <span key={li}>
                  {renderLine(ln, li)}
                  {li < blk.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </article>

        <SignedOut>
          <SignInGate assignmentId={a.id} />
        </SignedOut>
        <SignedIn>
          {!a.questions ? (
            <TextSubmitForm assignmentId={a.id} />
          ) : isPublicFreeResponse(a.questions[0]) ? (
            <FreeResponseForm
              assignmentId={a.id}
              questions={a.questions as PublicFreeResponseQuestion[]}
            />
          ) : (
            <PracticeForm
              assignmentId={a.id}
              questions={a.questions as PublicAssignmentQuestion[]}
            />
          )}
        </SignedIn>

        <div className="mt-16 border-t border-foreground/10 pt-6 text-center">
          <div className="font-mono-hud hud-dim text-[11px] tracking-[0.25em]">
            ATHENA · EDUCATORS
          </div>
        </div>
      </div>
    </div>
  );
}

function useSubmitWork(assignmentId: string) {
  return useMutation({
    mutationFn: async (payload: {
      response?: string;
      answers?: number[];
      images?: { data: string; mediaType: string }[];
    }): Promise<SubmitResult> => {
      const r = await fetch(`/api/educators/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await r.json().catch(() => null)) as
        | (SubmitResult & { error?: string })
        | null;
      if (!r.ok) throw new Error(body?.error ?? "Could not submit. Try again.");
      return body as SubmitResult;
    },
  });
}

/** Signed-out students see this: do the homework after a free sign-up. */
const SignInGate = ({ assignmentId }: { assignmentId: string }) => (
  <section className="mt-12 rounded-lg border border-foreground/12 bg-foreground/[0.02] p-8 text-center">
    <GraduationCap size={26} className="mx-auto text-foreground/70" />
    <h2 className="mt-4 text-2xl font-light tracking-tight text-foreground">
      Sign in to do this homework
    </h2>
    <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-foreground/70">
      Create a free Athena account with your school email so your teacher gets
      your work. Doing homework is always free.
    </p>
    <SignInButton
      mode="redirect"
      forceRedirectUrl={`/educators/a/${assignmentId}`}
      signUpForceRedirectUrl={`/educators/a/${assignmentId}`}
    >
      <button className="font-mono-hud hud-text mx-auto mt-6 flex h-12 items-center justify-center gap-2 rounded-full border border-foreground/30 px-8 text-foreground transition hover:border-foreground/60">
        <LogIn size={15} />
        Sign in / create a free account
      </button>
    </SignInButton>
  </section>
);

/** Shown above the doing UI when signed in — who the work turns in as. */
const SubmitterBanner = () => {
  const { user } = useAuthUser();
  const email = user?.email;
  if (!email) return null;
  return (
    <div className="font-mono-hud hud-dim mb-4 flex items-center gap-2 text-[11px] tracking-[0.15em]">
      <GraduationCap size={12} />
      TURNING IN AS {email.toUpperCase()}
    </div>
  );
};

/* ─────────────────────── Text homework: turn-in ─────────────────────── */

const TextSubmitForm = ({ assignmentId }: { assignmentId: string }) => {
  const [response, setResponse] = useState("");
  const [photos, setPhotos] = useState<WorkPhoto[]>([]);
  const [encoding, setEncoding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = useSubmitWork(assignmentId);

  const pickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(
      0,
      MAX_PHOTOS - photos.length
    );
    e.target.value = "";
    if (!files.length) return;
    setEncoding(true);
    try {
      const encoded = await Promise.all(files.map(fileToWorkPhoto));
      setPhotos((prev) => [...prev, ...encoded].slice(0, MAX_PHOTOS));
    } finally {
      setEncoding(false);
    }
  };

  if (submit.isSuccess && submit.data) {
    return (
      <SuccessCard
        name={submit.data.studentName}
        message="Your work is turned in. Your teacher will grade it soon."
        onAgain={() => {
          setPhotos([]);
          submit.reset();
        }}
      />
    );
  }

  const canSubmit = !!response.trim() || photos.length > 0;

  return (
    <section className="mt-12 rounded-lg border border-foreground/12 bg-foreground/[0.02] p-6">
      <div className="font-mono-hud hud-dim mb-5 flex items-center gap-2 text-[12px] tracking-[0.25em]">
        <PencilLine size={13} />
        TURN IN YOUR WORK
      </div>
      <div className="space-y-4">
        <SubmitterBanner />
        <label className="block">
          <span className="font-mono-hud hud-dim mb-2 block text-[11px] tracking-[0.2em]">
            YOUR ANSWER
          </span>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={8}
            placeholder="Type your work and answers here, or add photos of your work on paper below."
            className="w-full resize-y rounded-md border border-foreground/15 bg-foreground/[0.03] p-4 text-[15px] leading-relaxed text-foreground placeholder:text-foreground/45 focus:border-foreground/40 focus:outline-none"
          />
        </label>

        {/* Photos of handwritten work */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={pickPhotos}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((p, i) => (
              <span key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt={`Photo of your work, page ${i + 1}`}
                  className="h-20 w-20 rounded-md border border-foreground/15 object-cover"
                />
                <button
                  onClick={() =>
                    setPhotos((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-foreground/30 bg-background text-foreground/80 transition hover:text-foreground"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={encoding}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-foreground/20 text-foreground/60 transition hover:border-foreground/45 hover:text-foreground disabled:opacity-50"
              >
                {encoding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                <span className="font-mono-hud text-[9px] tracking-[0.12em]">
                  ADD PHOTO
                </span>
              </button>
            )}
          </div>
          <p className="font-mono-hud hud-dim mt-2 text-[11px] leading-relaxed tracking-[0.1em]">
            Worked on paper? Snap up to {MAX_PHOTOS} photos. Your teacher sees
            and grades them.
          </p>
        </div>

        {submit.isError && (
          <p className="text-sm text-destructive">
            {submit.error instanceof Error
              ? submit.error.message
              : "Could not submit."}
          </p>
        )}
        <button
          onClick={() =>
            submit.mutate({
              response,
              images: photos.map((p) => ({
                data: p.data,
                mediaType: p.mediaType,
              })),
            })
          }
          disabled={submit.isPending || encoding || !canSubmit}
          className="font-mono-hud hud-text flex h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground/30 text-foreground transition hover:border-foreground/60 disabled:opacity-50"
        >
          {submit.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Turn in
        </button>
        <p className="font-mono-hud hud-dim text-center text-[11px] leading-relaxed tracking-[0.1em]">
          Turning in again replaces your previous answer.
        </p>
      </div>
    </section>
  );
};

/* ─────────────────── Practice set: answer + auto-grade ─────────────────── */

const PracticeForm = ({
  assignmentId,
  questions,
}: {
  assignmentId: string;
  questions: PublicAssignmentQuestion[];
}) => {
  const [answers, setAnswers] = useState<number[]>(() =>
    questions.map(() => -1)
  );
  const submit = useSubmitWork(assignmentId);

  const answeredCount = useMemo(
    () => answers.filter((x) => x >= 0).length,
    [answers]
  );
  const allAnswered = answeredCount === questions.length;

  if (submit.isSuccess && submit.data?.graded) {
    const g = submit.data.graded;
    return (
      <SuccessCard
        name={submit.data.studentName}
        message={`You got ${g.correctCount} of ${g.total} correct. That's ${g.grade}%. Your teacher can see your score.`}
        onAgain={() => submit.reset()}
        againLabel="Try again (replaces your score)"
      />
    );
  }

  return (
    <section className="mt-12">
      <div className="font-mono-hud hud-dim mb-5 flex items-center gap-2 text-[12px] tracking-[0.25em]">
        <PencilLine size={13} />
        ANSWER THE QUESTIONS · {answeredCount}/{questions.length}
      </div>
      <div className="space-y-6">
        {questions.map((q, qi) => (
          <div
            key={q.id}
            className="rounded-lg border border-foreground/12 bg-foreground/[0.02] p-5"
          >
            <div className="flex gap-3 text-[15.5px] leading-relaxed text-foreground/90">
              <span className="font-mono-hud mt-0.5 text-foreground/55">
                {qi + 1}.
              </span>
              <MathContent content={q.prompt} size="base" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[qi] = oi;
                        return next;
                      })
                    }
                    aria-pressed={chosen}
                    className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left text-[15px] transition ${
                      chosen
                        ? "border-foreground/60 bg-foreground/[0.07] text-foreground"
                        : "border-foreground/12 bg-foreground/[0.02] text-foreground/80 hover:border-foreground/35"
                    }`}
                  >
                    <span
                      className={`font-mono-hud flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] ${
                        chosen
                          ? "border-foreground/60 text-foreground"
                          : "border-foreground/20 text-foreground/60"
                      }`}
                    >
                      {OPTION_LETTERS[oi]}
                    </span>
                    <MathContent content={opt} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4 rounded-lg border border-foreground/12 bg-foreground/[0.02] p-6">
        <SubmitterBanner />
        {submit.isError && (
          <p className="text-sm text-destructive">
            {submit.error instanceof Error
              ? submit.error.message
              : "Could not submit."}
          </p>
        )}
        <button
          onClick={() => submit.mutate({ answers })}
          disabled={submit.isPending || !allAnswered}
          className="font-mono-hud hud-text flex h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground/30 text-foreground transition hover:border-foreground/60 disabled:opacity-50"
        >
          {submit.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {allAnswered
            ? "Submit answers"
            : `Answer ${questions.length - answeredCount} more`}
        </button>
      </div>
    </section>
  );
};

/* ──────────── Free-response quiz: answer each question, then turn in ─────────
 * Generated homework rendered as discrete questions. The student types an
 * answer per question (and/or snaps photos of handwritten work); on submit the
 * per-question answers are folded into one response that the teacher AI/vision-
 * grades against the answer key. (Photo picker mirrors TextSubmitForm's — kept
 * inline to leave that working flow untouched.) */
const FreeResponseForm = ({
  assignmentId,
  questions,
}: {
  assignmentId: string;
  questions: PublicFreeResponseQuestion[];
}) => {
  const [answers, setAnswers] = useState<string[]>(() =>
    questions.map(() => "")
  );
  const [photos, setPhotos] = useState<WorkPhoto[]>([]);
  const [encoding, setEncoding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = useSubmitWork(assignmentId);

  const pickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(
      0,
      MAX_PHOTOS - photos.length
    );
    e.target.value = "";
    if (!files.length) return;
    setEncoding(true);
    try {
      const encoded = await Promise.all(files.map(fileToWorkPhoto));
      setPhotos((prev) => [...prev, ...encoded].slice(0, MAX_PHOTOS));
    } finally {
      setEncoding(false);
    }
  };

  if (submit.isSuccess && submit.data) {
    return (
      <SuccessCard
        name={submit.data.studentName}
        message="Your answers are turned in. Your teacher will grade them soon."
        onAgain={() => {
          setPhotos([]);
          setAnswers(questions.map(() => ""));
          submit.reset();
        }}
      />
    );
  }

  const answeredCount = answers.filter((a) => a.trim()).length;
  const canSubmit = answeredCount > 0 || photos.length > 0;

  return (
    <section className="mt-12">
      <div className="font-mono-hud hud-dim mb-5 flex items-center gap-2 text-[12px] tracking-[0.25em]">
        <PencilLine size={13} />
        ANSWER THE QUESTIONS · {answeredCount}/{questions.length}
      </div>
      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div
            key={q.id}
            className="rounded-lg border border-foreground/12 bg-foreground/[0.02] p-5"
          >
            <div className="flex gap-3 text-[15.5px] leading-relaxed text-foreground/90">
              <span className="font-mono-hud mt-0.5 text-foreground/55">
                {qi + 1}.
              </span>
              <MathContent content={q.prompt} size="base" />
            </div>
            <textarea
              value={answers[qi]}
              onChange={(e) =>
                setAnswers((prev) => {
                  const next = [...prev];
                  next[qi] = e.target.value;
                  return next;
                })
              }
              rows={3}
              placeholder="Your answer…"
              className="mt-3 w-full resize-y rounded-md border border-foreground/15 bg-foreground/[0.03] p-3 text-[15px] leading-relaxed text-foreground placeholder:text-foreground/45 focus:border-foreground/40 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Photos of handwritten work (covers the whole quiz). */}
      <div className="mt-6">
        <div className="font-mono-hud hud-dim mb-2 text-[11px] tracking-[0.2em]">
          PHOTOS OF YOUR WORK · OPTIONAL
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={pickPhotos}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((p, i) => (
            <span key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt={`Photo of your work, page ${i + 1}`}
                className="h-20 w-20 rounded-md border border-foreground/15 object-cover"
              />
              <button
                onClick={() =>
                  setPhotos((prev) => prev.filter((_, j) => j !== i))
                }
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-foreground/30 bg-background text-foreground/80 transition hover:text-foreground"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={encoding}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-foreground/20 text-foreground/60 transition hover:border-foreground/45 hover:text-foreground disabled:opacity-50"
            >
              {encoding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Camera size={16} />
              )}
              <span className="font-mono-hud text-[9px] tracking-[0.12em]">
                ADD PHOTO
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4 rounded-lg border border-foreground/12 bg-foreground/[0.02] p-6">
        <SubmitterBanner />
        {submit.isError && (
          <p className="text-sm text-destructive">
            {submit.error instanceof Error
              ? submit.error.message
              : "Could not submit."}
          </p>
        )}
        <button
          onClick={() =>
            submit.mutate({
              response: assembleQuizResponse(questions, answers),
              images: photos.map((p) => ({
                data: p.data,
                mediaType: p.mediaType,
              })),
            })
          }
          disabled={submit.isPending || encoding || !canSubmit}
          className="font-mono-hud hud-text flex h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground/30 text-foreground transition hover:border-foreground/60 disabled:opacity-50"
        >
          {submit.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Turn in
        </button>
        <p className="font-mono-hud hud-dim text-center text-[11px] leading-relaxed tracking-[0.1em]">
          Turning in again replaces your previous answers.
        </p>
      </div>
    </section>
  );
};

const SuccessCard = ({
  name,
  message,
  onAgain,
  againLabel = "Submit again (replaces your previous answer)",
}: {
  name: string;
  message: string;
  onAgain: () => void;
  againLabel?: string;
}) => (
  <section className="mt-12 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-8 text-center">
    <CheckCircle2 size={28} className="mx-auto text-emerald-400/90" />
    <h2 className="mt-4 text-2xl font-light tracking-tight text-foreground">
      Nice work, {name}.
    </h2>
    <p className="mt-2 text-[15px] leading-relaxed text-foreground/75">{message}</p>
    <button
      onClick={onAgain}
      className="font-mono-hud hud-dim mt-6 text-[11px] tracking-[0.15em] underline-offset-4 transition hover:text-foreground hover:underline"
    >
      {againLabel}
    </button>
  </section>
);
