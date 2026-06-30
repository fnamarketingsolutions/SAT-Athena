import { supabase } from "@/lib/supabase/client";

export type ClassifierMatch = {
  topicSlug: string;
  subtopicSlug: string;
  weight: number;
  rationale: string;
};

export type ClassifierResponse = {
  subject: "math" | "reading-writing";
  matches: ClassifierMatch[];
  notes: string | null;
};

const MAX_MATCHES = 4;

function extractJsonObject(text: string): Record<string, unknown> {
  let content = text.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const start = content.indexOf("{");
    if (start === -1) throw new Error("No JSON object in classifier response");
    let depth = 0;
    for (let i = start; i < content.length; i++) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(content.slice(start, i + 1)) as Record<string, unknown>;
        }
      }
    }
    throw new Error("Could not parse JSON from classifier response");
  }
}

async function loadTaxonomy() {
  const { data: topics } = await supabase
    .from("topics")
    .select("id, slug, name")
    .order("order_index", { ascending: true });

  const { data: subtopics } = await supabase
    .from("subtopics")
    .select("id, topic_id, slug, name, description");

  const topicById = new Map((topics ?? []).map((t) => [t.id, t]));
  const lines = ["topic_slug › subtopic_slug — subtopic name"];

  for (const st of subtopics ?? []) {
    const topic = topicById.get(st.topic_id);
    if (!topic) continue;
    let desc = (st.description ?? "").trim().replace(/\n/g, " ");
    if (desc.length > 140) desc = `${desc.slice(0, 137)}...`;
    const suffix = desc ? ` — ${desc}` : "";
    lines.push(`  ${topic.slug} › ${st.slug} — ${st.name}${suffix}`);
  }

  const slugSet = new Set(
    (subtopics ?? [])
      .map((st) => {
        const topic = topicById.get(st.topic_id);
        return topic ? `${topic.slug}:${st.slug}` : null;
      })
      .filter((x): x is string => Boolean(x))
  );

  const entries = (subtopics ?? [])
    .map((st) => {
      const topic = topicById.get(st.topic_id);
      if (!topic) return null;
      const label = `${topic.slug} ${topic.name}`.toLowerCase();
      const subject: "math" | "reading-writing" =
        /reading|writing|grammar|vocab|english|rhetoric|literacy/.test(label)
          ? "reading-writing"
          : "math";
      return {
        topicSlug: topic.slug,
        subtopicSlug: st.slug,
        name: st.name,
        description: (st.description ?? "").toLowerCase(),
        subject,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return { taxonomyBlock: lines.join("\n"), slugSet, entries };
}

function keywordFallback(
  plan: string,
  entries: {
    topicSlug: string;
    subtopicSlug: string;
    name: string;
    description: string;
    subject: "math" | "reading-writing";
  }[]
): ClassifierResponse {
  const text = plan.toLowerCase();
  const scored: { entry: (typeof entries)[number]; score: number }[] = [];

  for (const entry of entries) {
    let score = 0;
    const name = entry.name.toLowerCase();
    const slugPhrase = entry.subtopicSlug.replace(/-/g, " ");

    if (text.includes(name)) score += 12;
    if (slugPhrase.length > 4 && text.includes(slugPhrase)) score += 10;

    for (const token of name.split(/[\s/&,]+/).filter((t) => t.length > 3)) {
      if (text.includes(token)) score += 3;
    }

    for (const token of slugPhrase.split(" ").filter((t) => t.length > 3)) {
      if (text.includes(token)) score += 2;
    }

    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, MAX_MATCHES);
  if (top.length === 0) {
    return { subject: "math", matches: [], notes: null };
  }

  const total = top.reduce((sum, row) => sum + row.score, 0);
  return {
    subject: top[0].entry.subject,
    matches: top.map(({ entry, score }) => ({
      topicSlug: entry.topicSlug,
      subtopicSlug: entry.subtopicSlug,
      weight: score / total,
      rationale: `Matched keywords for “${entry.name}”.`,
    })),
    notes: null,
  };
}

function normalizeMatches(
  raw: ClassifierResponse,
  slugSet: Set<string>
): ClassifierResponse {
  const cleaned = raw.matches
    .filter((m) => slugSet.has(`${m.topicSlug}:${m.subtopicSlug}`) && m.weight > 0)
    .slice(0, MAX_MATCHES);

  const total = cleaned.reduce((sum, m) => sum + m.weight, 0);
  if (total > 0) {
    for (const m of cleaned) m.weight = m.weight / total;
  }

  return { subject: raw.subject, matches: cleaned, notes: raw.notes };
}

/** Classify a lesson plan via Anthropic when the Python agent service is down. */
export async function classifyLessonPlanLocal(
  plan: string,
  userId: string
): Promise<ClassifierResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const { taxonomyBlock, slugSet, entries } = await loadTaxonomy();
  const prompt = `TAXONOMY:
${taxonomyBlock}

LESSON PLAN:
<<<
${plan.trim()}
>>>

Return ONLY valid JSON (no markdown) with this shape:
{
  "subject": "math" | "reading-writing",
  "matches": [
    {
      "topicSlug": "<exact slug from taxonomy>",
      "subtopicSlug": "<exact slug from taxonomy>",
      "weight": <number in (0, 1]>,
      "rationale": "<one sentence>"
    }
  ],
  "notes": "<optional note if part of the plan does NOT fit any subtopic, or null>"
}

Rules:
- At most ${MAX_MATCHES} matches; weights must sum to 1.0.
- Use only slugs from the taxonomy verbatim.
- If the plan does not fit (e.g. Python programming, biology, history), return matches: [] and explain in notes.
- This app covers SAT Math and Reading & Writing only.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      metadata: { user_id: userId },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic classify failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const obj = extractJsonObject(text);

  const raw: ClassifierResponse = {
    subject: obj.subject === "reading-writing" ? "reading-writing" : "math",
    matches: Array.isArray(obj.matches)
      ? obj.matches.map((m: Record<string, unknown>) => ({
          topicSlug: String(m.topicSlug ?? m.topic_slug ?? ""),
          subtopicSlug: String(m.subtopicSlug ?? m.subtopic_slug ?? ""),
          weight: Number(m.weight) || 0,
          rationale: String(m.rationale ?? ""),
        }))
      : [],
    notes: obj.notes != null ? String(obj.notes) : null,
  };

  const normalized = normalizeMatches(raw, slugSet);
  if (normalized.matches.length > 0) return normalized;

  const fromKeywords = keywordFallback(plan, entries);
  if (fromKeywords.matches.length > 0) {
    return normalizeMatches(fromKeywords, slugSet);
  }

  return normalized;
}
