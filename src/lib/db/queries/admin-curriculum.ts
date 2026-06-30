import { supabase } from "@/lib/supabase/client";
import type { Json } from "@/types/supabase";

export type CurriculumSubject =
  | "math"
  | "reading-writing"
  | "science"
  | "social-studies";

export type AdminTopic = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  icon: string;
  orderIndex: number;
  colorScheme: string;
  overview: string;
  subtopicCount: number;
};

export type AdminSubtopic = {
  id: string;
  topicId: string;
  slug: string;
  name: string;
  orderIndex: number;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  problemCount: number;
};

export type CurriculumTree = {
  topics: Array<AdminTopic & { subtopics: AdminSubtopic[] }>;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[(),]/g, "");
}

function topicDefaults(name: string, subject: string) {
  return {
    overview: `${name} — ${subject} curriculum topic.`,
    learning_objectives: [] as string[],
    sat_relevance: {
      questionCount: 0,
      percentageOfTest: 0,
      description: "",
    },
    difficulty_distribution: { easy: 33, medium: 34, hard: 33 },
    estimated_total_minutes: 120,
    prerequisites: [] as string[],
    key_concepts: [] as string[],
    pro_tips: [] as string[],
  };
}

function subtopicDefaults(name: string) {
  return {
    description: name,
    learning_objectives: [] as Json,
    conceptual_overview: {} as Json,
    key_formulas: [] as Json,
    common_mistakes: [] as Json,
    tips_and_tricks: [] as Json,
    prerequisite_subtopic_slugs: [] as Json,
  };
}

export async function listCurriculum(
  subject?: CurriculumSubject
): Promise<CurriculumTree> {
  let topicsQuery = supabase
    .from("topics")
    .select("id, slug, name, subject, icon, order_index, color_scheme, overview")
    .order("order_index", { ascending: true });

  if (subject) {
    topicsQuery = topicsQuery.eq("subject", subject);
  }

  const { data: topics, error: topicsErr } = await topicsQuery;
  if (topicsErr) throw topicsErr;

  const topicIds = (topics ?? []).map((t) => t.id);
  if (topicIds.length === 0) return { topics: [] };

  const { data: subtopics, error: subErr } = await supabase
    .from("subtopics")
    .select(
      "id, topic_id, slug, name, order_index, description, difficulty, estimated_minutes"
    )
    .in("topic_id", topicIds)
    .order("order_index", { ascending: true });
  if (subErr) throw subErr;

  const subtopicIds = (subtopics ?? []).map((s) => s.id);
  const problemCounts = new Map<string, number>();

  if (subtopicIds.length > 0) {
    const { data: problems } = await supabase
      .from("problems")
      .select("subtopic_id")
      .in("subtopic_id", subtopicIds)
      .eq("source", "sat");
    for (const p of problems ?? []) {
      if (p.subtopic_id) {
        problemCounts.set(
          p.subtopic_id,
          (problemCounts.get(p.subtopic_id) ?? 0) + 1
        );
      }
    }
  }

  const subsByTopic = new Map<string, AdminSubtopic[]>();
  for (const st of subtopics ?? []) {
    const row: AdminSubtopic = {
      id: st.id,
      topicId: st.topic_id,
      slug: st.slug,
      name: st.name,
      orderIndex: st.order_index,
      description: st.description,
      difficulty: st.difficulty,
      estimatedMinutes: st.estimated_minutes,
      problemCount: problemCounts.get(st.id) ?? 0,
    };
    const list = subsByTopic.get(st.topic_id) ?? [];
    list.push(row);
    subsByTopic.set(st.topic_id, list);
  }

  return {
    topics: (topics ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      subject: t.subject,
      icon: t.icon,
      orderIndex: t.order_index,
      colorScheme: t.color_scheme,
      overview: t.overview,
      subtopicCount: subsByTopic.get(t.id)?.length ?? 0,
      subtopics: subsByTopic.get(t.id) ?? [],
    })),
  };
}

export async function createTopic(input: {
  name: string;
  slug?: string;
  subject: CurriculumSubject;
  icon?: string;
  colorScheme?: string;
  orderIndex?: number;
  overview?: string;
}) {
  const slug = (input.slug?.trim() || slugify(input.name)).toLowerCase();
  const subject = input.subject;

  let orderIndex = input.orderIndex;
  if (orderIndex == null) {
    const { data: maxRow } = await supabase
      .from("topics")
      .select("order_index")
      .eq("subject", subject)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    orderIndex = (maxRow?.order_index ?? 0) + 1;
  }

  const defaults = topicDefaults(input.name, subject);
  const { overview: _o, ...restDefaults } = defaults;
  const { data, error } = await supabase
    .from("topics")
    .insert({
      slug,
      name: input.name.trim(),
      subject,
      icon: input.icon?.trim() || "📚",
      order_index: orderIndex,
      color_scheme: input.colorScheme?.trim() || "blue",
      overview: input.overview?.trim() || defaults.overview,
      ...restDefaults,
    })
    .select("id, slug, name, subject, icon, order_index, color_scheme, overview")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTopic(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    subject: CurriculumSubject;
    icon: string;
    colorScheme: string;
    orderIndex: number;
    overview: string;
  }>
) {
  const patch: Record<string, unknown> = {};
  if (input.name != null) patch.name = input.name.trim();
  if (input.slug != null) patch.slug = input.slug.trim().toLowerCase();
  if (input.subject != null) patch.subject = input.subject;
  if (input.icon != null) patch.icon = input.icon.trim();
  if (input.colorScheme != null) patch.color_scheme = input.colorScheme.trim();
  if (input.orderIndex != null) patch.order_index = input.orderIndex;
  if (input.overview != null) patch.overview = input.overview.trim();

  const { data, error } = await supabase
    .from("topics")
    .update(patch)
    .eq("id", id)
    .select("id, slug, name, subject, icon, order_index, color_scheme, overview")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}

export async function createSubtopic(input: {
  topicId: string;
  name: string;
  slug?: string;
  orderIndex?: number;
  description?: string;
  difficulty?: string;
  estimatedMinutes?: number;
}) {
  const slug = (input.slug?.trim() || slugify(input.name)).toLowerCase();

  let orderIndex = input.orderIndex;
  if (orderIndex == null) {
    const { data: maxRow } = await supabase
      .from("subtopics")
      .select("order_index")
      .eq("topic_id", input.topicId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    orderIndex = (maxRow?.order_index ?? -1) + 1;
  }

  const defaults = subtopicDefaults(input.name);
  const { description: _d, ...restDefaults } = defaults;
  const { data, error } = await supabase
    .from("subtopics")
    .insert({
      topic_id: input.topicId,
      slug,
      name: input.name.trim(),
      order_index: orderIndex,
      description: input.description?.trim() || defaults.description,
      difficulty: input.difficulty?.trim() || "medium",
      estimated_minutes: input.estimatedMinutes ?? 30,
      ...restDefaults,
    })
    .select(
      "id, topic_id, slug, name, order_index, description, difficulty, estimated_minutes"
    )
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubtopic(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    orderIndex: number;
    description: string;
    difficulty: string;
    estimatedMinutes: number;
  }>
) {
  const patch: Record<string, unknown> = {};
  if (input.name != null) patch.name = input.name.trim();
  if (input.slug != null) patch.slug = input.slug.trim().toLowerCase();
  if (input.orderIndex != null) patch.order_index = input.orderIndex;
  if (input.description != null) patch.description = input.description.trim();
  if (input.difficulty != null) patch.difficulty = input.difficulty.trim();
  if (input.estimatedMinutes != null)
    patch.estimated_minutes = input.estimatedMinutes;

  const { data, error } = await supabase
    .from("subtopics")
    .update(patch)
    .eq("id", id)
    .select(
      "id, topic_id, slug, name, order_index, description, difficulty, estimated_minutes"
    )
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubtopic(id: string) {
  const { error } = await supabase.from("subtopics").delete().eq("id", id);
  if (error) throw error;
}
