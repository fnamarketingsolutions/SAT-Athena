/**
 * Generate MBE-style MCQs for EVERY MBE subtopic via Anthropic, then seed them
 * into Supabase as static problems (source: practice). Generate once, reuse
 * forever — this is the cheap/fast base the app serves before live AI top-up.
 *
 * Run: npm run seed:mbe-generate            (default 3 MCQs per subtopic)
 *      npm run seed:mbe-generate -- 5       (5 per subtopic)
 *
 * Idempotent: skips subtopics that already have >= target practice problems.
 */
import { supabase } from "../src/lib/supabase/client";
import { isMbeSubject } from "../src/lib/exam-config";

const MODEL = "claude-sonnet-4-6";
const PER_SUBTOPIC = Math.max(1, Math.min(Number(process.argv[2]) || 3, 10));

type GeneratedMcq = {
  questionText: string;
  options: [string, string, string, string];
  correctOption: number;
  explanation: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
};

function extractJson(text: string): unknown {
  let content = text.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      return JSON.parse(content.slice(start, end + 1));
    }
    throw new Error("No JSON array found in model response");
  }
}

async function generateForSubtopic(
  apiKey: string,
  subjectLabel: string,
  topicName: string,
  subtopicName: string,
  count: number
): Promise<GeneratedMcq[]> {
  const prompt = `You are a bar exam question writer for the Multistate Bar Examination (MBE).

Subject: ${subjectLabel}
Topic: ${topicName}
Subtopic: ${subtopicName}

Write ${count} high-quality MBE-style multiple-choice questions on this exact subtopic.

Requirements:
- Each question has a short fact pattern and a clear call-of-the-question.
- Exactly 4 answer options, only ONE correct.
- Test real black-letter law (majority rule / Restatement / FRE / FRCP / Constitution).
- Vary difficulty across easy, medium, hard.
- Explanation states the rule and why the correct answer is right.
- Hint guides without giving the answer away.

Return ONLY a valid JSON array (no markdown), each element:
{
  "questionText": "string",
  "options": ["A", "B", "C", "D"],
  "correctOption": 0,
  "explanation": "string",
  "hint": "string",
  "difficulty": "easy" | "medium" | "hard"
}
correctOption is the 0-based index of the correct option.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const parsed = extractJson(text) as GeneratedMcq[];

  return parsed.filter(
    (q) =>
      q &&
      typeof q.questionText === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.correctOption === "number" &&
      q.correctOption >= 0 &&
      q.correctOption <= 3
  );
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set in .env");
    process.exit(1);
  }

  console.log(`Generating ${PER_SUBTOPIC} MCQ(s) per MBE subtopic via ${MODEL}...\n`);

  const { data: topics } = await supabase
    .from("topics")
    .select("id, slug, name, subject")
    .order("order_index", { ascending: true });

  const mbeTopics = (topics ?? []).filter((t) => isMbeSubject(t.subject));

  const subjectLabel = (subject: string) =>
    subject
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  let totalInserted = 0;
  let subtopicsDone = 0;
  let subtopicsSkipped = 0;
  let failures = 0;

  for (const topic of mbeTopics) {
    const { data: subtopics } = await supabase
      .from("subtopics")
      .select("id, slug, name")
      .eq("topic_id", topic.id)
      .order("order_index", { ascending: true });

    for (const st of subtopics ?? []) {
      // Skip if already has enough practice problems.
      const { count: existingCount } = await supabase
        .from("problems")
        .select("id", { count: "exact", head: true })
        .eq("subtopic_id", st.id)
        .eq("source", "practice");

      if ((existingCount ?? 0) >= PER_SUBTOPIC) {
        subtopicsSkipped++;
        continue;
      }

      const need = PER_SUBTOPIC - (existingCount ?? 0);

      try {
        const mcqs = await generateForSubtopic(
          apiKey,
          subjectLabel(topic.subject),
          topic.name,
          st.name,
          need
        );

        if (mcqs.length === 0) {
          console.warn(`  ! no MCQs parsed for ${topic.slug} / ${st.slug}`);
          failures++;
          continue;
        }

        const baseIndex = existingCount ?? 0;
        const rows = mcqs.map((q, i) => ({
          subtopic_id: st.id,
          topic_slug: topic.slug,
          subtopic_slug: st.slug,
          source: "practice" as const,
          order_index: baseIndex + i + 1,
          difficulty: q.difficulty ?? "medium",
          difficulty_level:
            q.difficulty === "easy" ? 1 : q.difficulty === "hard" ? 3 : 2,
          category: topic.subject,
          question_text: q.questionText,
          options: q.options,
          correct_option: q.correctOption,
          explanation: q.explanation ?? "",
          hint: q.hint ?? "",
          detailed_hint: q.hint ?? "",
          solution_steps: [],
          common_errors: [],
          concept_tags: [topic.subject, st.slug],
          time_recommendation_seconds: 90,
        }));

        const { error } = await supabase.from("problems").insert(rows);
        if (error) {
          console.error(`  × insert ${topic.slug}/${st.slug}:`, error.message);
          failures++;
          continue;
        }

        totalInserted += rows.length;
        subtopicsDone++;
        console.log(`+ ${topic.name} → ${st.name} (${rows.length})`);
      } catch (e) {
        console.error(
          `  × ${topic.slug}/${st.slug}:`,
          e instanceof Error ? e.message : String(e)
        );
        failures++;
      }
    }
  }

  const { count } = await supabase
    .from("problems")
    .select("id", { count: "exact", head: true })
    .eq("source", "practice");

  console.log("\nDone.");
  console.log(
    `Inserted ${totalInserted} MCQs across ${subtopicsDone} subtopics. Skipped ${subtopicsSkipped} (already seeded). Failures: ${failures}.`
  );
  console.log(`DB now has ${count ?? 0} practice-source problems.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
