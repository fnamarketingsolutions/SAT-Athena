"use client";

import { MentorGuidesPanel } from "@/components/mentor/mentor-guides-panel";
import { MentorChatPanel } from "@/components/mentor/mentor-chat-panel";

/**
 * Mentor hub — human guide / calendar / slots plus a compact chat-only AI.
 * Replaces the full-screen whiteboard lesson mentor surface.
 */
export default function MentorPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <MentorGuidesPanel />
        <div className="lg:sticky lg:top-6">
          <MentorChatPanel />
        </div>
      </div>
    </div>
  );
}
