"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { MathContent } from "@/components/quiz/math-content";
import type { Flashcard, FlashcardOption } from "@/types/flashcards";
import { cn } from "@/lib/utils";

/** Some stored questions (esp. AI-generated) embed the lettered options inside
 *  `questionText` in addition to the clean `options` array. Split the stem off
 *  so we can render each option on its own line without duplicating them. */
function splitFront(front: Flashcard["front"]): {
  stem: string;
  options: FlashcardOption[];
} {
  const text = (front.questionText ?? "").trim();
  const options = front.options ?? [];
  const hasEmbedded =
    /\(?A[).]\s/.test(text) &&
    /\(?B[).]\s/.test(text) &&
    /\(?C[).]\s/.test(text) &&
    /\(?D[).]\s/.test(text);
  if (!hasEmbedded) return { stem: text, options };
  const match = text.match(/\n?\s*\(?A[).]\s/);
  const stem =
    match && match.index !== undefined
      ? text.slice(0, match.index).trim()
      : text;
  return { stem, options };
}

type FlashcardCardProps = {
  card: Flashcard;
  deckIndex: number;
  totalCards: number;
  isFlipped: boolean;
  isRegenerating?: boolean;
  onFlip: () => void;
};

export function FlashcardCard({
  card,
  deckIndex,
  totalCards,
  isFlipped,
  isRegenerating,
  onFlip,
}: FlashcardCardProps) {
  return (
    <div className="flashcard-shell relative" style={{ perspective: 1800 }}>
      <motion.div
        className="flashcard-3d relative cursor-pointer"
        style={{
          width: 640,
          height: 400,
          transformStyle: "preserve-3d",
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFlip();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? "Show question" : "Show answer"}
      >
        <CardFace side="front" card={card} deckIndex={deckIndex} totalCards={totalCards} />
        <CardFace side="back" card={card} deckIndex={deckIndex} totalCards={totalCards} />
      </motion.div>

      {isRegenerating && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            background: "var(--p-overlay)",
            border: "1px solid var(--p-rule)",
          }}
        >
          <div
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "var(--p-fg-mute)", fontFamily: "var(--font-jetbrains-mono)" }}
          >
            <RefreshCw className="h-3 w-3 animate-spin" />
            Regenerating…
          </div>
        </div>
      )}
    </div>
  );
}

function CardFace({
  side,
  card,
  deckIndex,
  totalCards,
}: {
  side: "front" | "back";
  card: Flashcard;
  deckIndex: number;
  totalCards: number;
}) {
  const isBack = side === "back";
  const scrollRef = useRef<HTMLDivElement>(null);

  // The card lives inside a `preserve-3d` rotated element, which breaks wheel /
  // touch routing to nested scroll containers in Chrome (only the scrollbar
  // thumb works). Drive the scroll manually so the wheel scrolls the content.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = () => el.scrollHeight > el.clientHeight;

    const onWheel = (e: WheelEvent) => {
      if (!canScroll()) return;
      e.preventDefault();
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    };

    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!canScroll()) return;
      const y = e.touches[0]?.clientY ?? lastY;
      const dy = lastY - y;
      lastY = y;
      e.preventDefault();
      e.stopPropagation();
      el.scrollTop += dy;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <div
      className={cn("absolute inset-0 flex flex-col overflow-hidden")}
      style={{
        background: "var(--p-card)",
        border: "1px solid var(--p-rule)",
        backfaceVisibility: "hidden",
        transform: isBack ? "rotateY(180deg)" : undefined,
        padding: "20px 28px 22px",
      }}
    >
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      <div className="flex items-center justify-between">
        <div
          className="font-mono text-[10px] uppercase tracking-[0.28em]"
          style={{ color: "var(--p-fg-mute)" }}
        >
          {isBack ? "Solution" : "Card"}{" "}
          <span style={{ color: "var(--p-fg)" }}>
            {deckIndex + 1}
          </span>
          <span style={{ color: "var(--p-fg-faint)" }}> / {totalCards}</span>
        </div>
        <div
          className="font-mono text-[9px] uppercase tracking-[0.32em]"
          style={{ color: "var(--p-accent)" }}
        >
          {card.difficulty}
        </div>
      </div>

      <div
        className="my-3 h-px w-full"
        style={{ background: "var(--p-rule)" }}
      />

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain"
        style={{ touchAction: "pan-y" }}
      >
        {isBack ? <BackBody card={card} /> : <FrontBody card={card} />}
      </div>

      <div
        className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[9px] uppercase tracking-[0.32em]"
        style={{ color: "var(--p-fg-faint)" }}
      >
        <span>{isBack ? "click to flip back" : "click to flip"}</span>
        <span aria-hidden>↻</span>
      </div>
    </div>
  );
}

function FrontBody({ card }: { card: Flashcard }) {
  const { stem, options } = splitFront(card.front);
  return (
    <div
      className="flashcard-question flex flex-1 flex-col justify-center gap-4 text-left"
      style={{ color: "var(--p-fg)" }}
    >
      <div className="w-full">
        <MathContent content={stem} size="lg" />
      </div>
      {options.length > 0 && (
        <ol className="flex list-none flex-col gap-2 p-0">
          {options.map((o) => (
            <li key={o.letter} className="flex gap-2.5 text-[15px] leading-snug">
              <span
                className="font-mono font-semibold"
                style={{ color: "var(--p-accent)" }}
              >
                {o.letter}.
              </span>
              <span className="flex-1">
                <MathContent content={o.text} size="base" />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function BackBody({ card }: { card: Flashcard }) {
  const answerText =
    card.front.options.find((o) => o.letter === card.back.correctLetter)?.text ??
    null;

  return (
    <>
      {answerText && (
        <div
          className="flex items-baseline gap-3 px-3 py-2"
          style={{
            background: "color-mix(in oklch, var(--p-accent) 14%, transparent)",
            border: "1px solid color-mix(in oklch, var(--p-accent) 45%, var(--p-rule))",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "var(--p-accent)" }}
          >
            Answer
          </span>
          <span
            className="text-[16px] leading-tight"
            style={{ color: "var(--p-fg)" }}
          >
            <MathContent content={answerText} size="base" />
          </span>
        </div>
      )}

      <div
        className="text-left text-[13px] leading-relaxed"
        style={{ color: "var(--p-fg)" }}
      >
        <MathContent content={card.back.explanation} size="sm" />
      </div>

      {card.back.solutionSteps.length > 0 && (
        <ol className="mt-1 flex list-none flex-col gap-1.5 p-0">
          {card.back.solutionSteps.map((step, i) => (
            <li
              key={i}
              className="flex gap-2 text-[12px] leading-snug"
              style={{ color: "var(--p-fg-dim)" }}
            >
              <span
                className="font-mono text-[10px]"
                style={{ color: "var(--p-accent)" }}
              >
                {i + 1}.
              </span>
              <span className="flex-1">
                <MathContent content={step} size="sm" />
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "pointer-events-none absolute h-2 w-2";
  const positional = {
    tl: "left-2 top-2 border-t border-l",
    tr: "right-2 top-2 border-t border-r",
    bl: "left-2 bottom-2 border-b border-l",
    br: "right-2 bottom-2 border-b border-r",
  }[pos];
  return (
    <span
      className={cn(base, positional)}
      style={{ borderColor: "var(--p-fg-faint)" }}
    />
  );
}

/** Standalone hook for managing the flip state of the currently-visible
 *  card. Lives here so the deck-view component stays focused on layout. */
export function useFlipState(currentIndex: number) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip when navigating to a different card.
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const flip = useCallback(() => setIsFlipped((p) => !p), []);
  return { isFlipped, flip };
}
