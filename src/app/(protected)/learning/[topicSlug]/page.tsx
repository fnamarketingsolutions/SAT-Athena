"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { TopicSidebar } from "@/components/learning/topic-sidebar";
import { TopicHeader } from "@/components/learning/topic-header";
import { SubtopicCard } from "@/components/learning/subtopic-card";
import { cn } from "@/lib/utils";

type Subtopic = {
  id: string;
  slug: string;
  name: string;
  difficulty: string;
  estimatedMinutes: number;
  description: string;
};

type Topic = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  overview: string;
  estimatedTotalMinutes: number;
  satRelevance: { percentageOfTest: number; description: string };
  difficultyDistribution: { easy: number; medium: number; hard: number };
  subtopics: Subtopic[];
};

export default function TopicPage() {
  const params = useParams<{ topicSlug: string }>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/learning");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setTopics(data.topics);
      } catch {
        toast.error("Failed to load learning data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeTopic = topics.find((t) => t.slug === params.topicSlug) ?? topics[0];

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-5xl px-4 py-4 sm:p-6">
        <div className="mb-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="hidden h-10 w-full bg-muted rounded-lg animate-pulse lg:block lg:h-auto lg:w-56" />
          <div className="flex-1 space-y-4">
            <div className="h-24 bg-muted rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeTopic) return null;

  return (
    <div className="mx-auto min-w-0 max-w-5xl px-4 py-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <Link
          href="/learning"
          className="text-sm font-medium text-muted-foreground hover:text-foreground lg:pointer-events-none lg:text-lg lg:font-bold lg:text-foreground"
        >
          <span className="lg:hidden">← All topics</span>
          <span className="hidden lg:inline">Learning</span>
        </Link>
      </div>

      {/* Mobile: horizontal topic picker (sidebar hidden on small screens) */}
      <div
        className="mb-4 overflow-x-auto pb-1 lg:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex w-max gap-2">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/learning/${topic.slug}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                topic.slug === activeTopic.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {topic.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="hidden lg:block">
          <TopicSidebar topics={topics} activeSlug={activeTopic.slug} />
        </div>
        <div className="min-w-0 flex-1 space-y-4 sm:space-y-6">
          <TopicHeader topic={activeTopic} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activeTopic.subtopics.map((st) => (
              <SubtopicCard
                key={st.id}
                subtopic={st}
                topicSlug={activeTopic.slug}
              />
            ))}
          </div>
          {activeTopic.subtopics.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No subtopics available for this topic yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
