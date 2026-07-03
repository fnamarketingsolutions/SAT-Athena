/**
 * Seed MBE practice MCQs into Supabase (source: practice).
 * Prerequisite: npm run seed:mbe-taxonomy
 * Run: npm run seed:mbe-problems
 */
import { supabase } from "../src/lib/supabase/client";
import { MBE_SEED_PROBLEMS } from "./mbe-problems-data";

async function resolveSubtopicId(
  topicSlug: string,
  subtopicSlug: string
): Promise<string | null> {
  const { data: topic } = await supabase
    .from("topics")
    .select("id")
    .eq("slug", topicSlug)
    .maybeSingle();

  if (!topic) return null;

  const { data: subtopic } = await supabase
    .from("subtopics")
    .select("id")
    .eq("topic_id", topic.id)
    .eq("slug", subtopicSlug)
    .maybeSingle();

  return subtopic?.id ?? null;
}

async function main() {
  console.log(`Seeding ${MBE_SEED_PROBLEMS.length} MBE practice problems...\n`);

  let inserted = 0;
  let skipped = 0;
  let missing = 0;

  for (let i = 0; i < MBE_SEED_PROBLEMS.length; i++) {
    const p = MBE_SEED_PROBLEMS[i];
    const subtopicId = await resolveSubtopicId(p.topicSlug, p.subtopicSlug);

    if (!subtopicId) {
      console.warn(
        `! missing subtopic: ${p.topicSlug} / ${p.subtopicSlug} — run seed:mbe-taxonomy first`
      );
      missing++;
      continue;
    }

    const { data: existing } = await supabase
      .from("problems")
      .select("id")
      .eq("subtopic_id", subtopicId)
      .eq("source", "practice")
      .eq("order_index", i + 1)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("problems").insert({
      subtopic_id: subtopicId,
      topic_slug: p.topicSlug,
      subtopic_slug: p.subtopicSlug,
      source: "practice",
      order_index: i + 1,
      difficulty: p.difficulty,
      difficulty_level:
        p.difficulty === "easy" ? 1 : p.difficulty === "medium" ? 2 : 3,
      category: p.category ?? p.topicSlug,
      question_text: p.questionText,
      options: p.options,
      correct_option: p.correctOption,
      explanation: p.explanation,
      hint: p.hint,
      detailed_hint: p.hint,
      solution_steps: [],
      common_errors: [],
      concept_tags: [p.topicSlug],
      time_recommendation_seconds: 90,
    });

    if (error) {
      console.error(`× ${p.topicSlug}/${p.subtopicSlug}:`, error.message);
      continue;
    }

    inserted++;
    console.log(`+ ${p.topicSlug} → ${p.subtopicSlug}`);
  }

  const { count } = await supabase
    .from("problems")
    .select("id", { count: "exact", head: true })
    .eq("source", "practice");

  console.log("\nDone.");
  console.log(`Inserted: ${inserted}, skipped (exists): ${skipped}, missing subtopic: ${missing}`);
  console.log(`DB now has ${count ?? 0} practice-source problems.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
