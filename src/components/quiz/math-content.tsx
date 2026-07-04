"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { sanitizeMathContent } from "@/lib/sanitize-math-content";

/** Strip simple HTML wrappers from CMS/agent output before render. */
function normalizeQuizText(content: string): string {
  if (!content.includes("<")) return content;
  return content
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Render text-with-math content. Producers should emit balanced `$...$`
 *  with currency escaped as `\$`, but the chat agent occasionally slips
 *  bare `$30` into prose — which would open an unbalanced math span and
 *  leak raw `\textcolor{...}` into the output. `sanitizeMathContent`
 *  escapes those bare-currency cases without touching real math spans.
 *
 *  `size` controls the prose modifier (`prose-sm`, default = 14px),
 *  `prose-base` = 16px, `prose-lg` = 18px. KaTeX inherits via the
 *  `.prose .katex { font-size: 1em }` rule in globals.css, so bumping
 *  the prose size also scales the math up. */
export const MathContent = React.memo(function MathContent({
  content,
  size = "sm",
}: {
  content: string;
  size?: "sm" | "base" | "lg";
}) {
  if (!content) return null;

  const normalized = normalizeQuizText(content);

  const proseClass =
    size === "lg" ? "prose-lg" : size === "base" ? "prose-base" : "prose-sm";
  const plainTextClass =
    size === "lg"
      ? "text-lg leading-relaxed"
      : size === "base"
        ? "text-base leading-relaxed"
        : "text-sm leading-relaxed";

  const wrapClass = "min-w-0 break-words [overflow-wrap:anywhere]";

  // Skip markdown pipeline for plain text (no $ for math, no markdown markers)
  if (
    !normalized.includes("$") &&
    !normalized.includes("#") &&
    !normalized.includes("*") &&
    !normalized.includes("`")
  ) {
    return (
      <span className={cn(plainTextClass, wrapClass, "whitespace-pre-wrap")}>
        {normalized}
      </span>
    );
  }

  const sanitized = sanitizeMathContent(normalized);

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        proseClass,
        wrapClass,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { trust: true, strict: "ignore" }]]}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
});
