"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { useLessonChat } from "@/hooks/use-lesson-chat";
import { MathContent } from "@/components/quiz/math-content";
import { cn } from "@/lib/utils";

/**
 * Compact chat-only mentor — Q&A help, not lesson / whiteboard building.
 */
export function MentorChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const chat = useLessonChat({
    variant: "mentor",
    topic: "",
    subtopic: "",
    lessonContent: "",
  });

  // Chat panel is text-only — skip TTS narration.
  useEffect(() => {
    chat.setNarrationDisabled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.chatMessages, chat.isProcessing]);

  const send = () => {
    const text = input.trim();
    if (!text || chat.isProcessing) return;
    setInput("");
    void chat.sendChat(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-border bg-card shadow-sm lg:min-h-[36rem]">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              Feeling lost? Ask our AI for help
            </h2>
            <p className="text-xs text-muted-foreground">
              Quick chat for rules, strategy, and study questions — not a full
              lesson builder.
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {chat.chatMessages.length === 0 && (
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 px-3 py-3">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Ask about an MBE subject, a rule you&apos;re stuck on, or how to
              structure your week. Keep it short — I&apos;ll answer in chat.
            </p>
          </div>
        )}

        {chat.chatMessages.map((msg, i) => {
          const isUser = msg.role === "user";
          const body = msg.content?.trim();
          if (!body && msg.isStreaming) {
            return (
              <div
                key={`streaming-${i}`}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="animate-pulse">Thinking…</span>
              </div>
            );
          }
          if (!body) return null;
          return (
            <div
              key={`${msg.role}-${i}`}
              className={cn(
                "max-w-[95%] rounded-lg px-3 py-2 text-sm",
                isUser
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {isUser ? (
                body
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MathContent content={body} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Athena anything…"
            disabled={chat.isProcessing}
            className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || chat.isProcessing}
            aria-label="Send message"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
