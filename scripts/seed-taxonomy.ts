/**
 * Fast taxonomy seed — inserts all SAT Math + R&W topics/subtopics without LLM.
 * Run: npx tsx --env-file=.env scripts/seed-taxonomy.ts
 */
import { supabase } from "../src/lib/supabase/client";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[(),]/g, "");
}

const MATH_CONTENT_MAP: Record<
  string,
  { order: number; icon: string; color: string; subtopics: string[] }
> = {
  Algebra: {
    order: 1,
    icon: "🔢",
    color: "blue",
    subtopics: [
      "Linear equations (one variable)",
      "Linear equations (two variables)",
      "Linear inequalities",
      "Systems of linear equations",
      "Linear functions",
    ],
  },
  "Advanced Math": {
    order: 2,
    icon: "📐",
    color: "purple",
    subtopics: [
      "Equivalent expressions",
      "Nonlinear equations (quadratic, exponential, radical, rational)",
      "Polynomial operations",
      "Nonlinear functions",
      "Function transformations",
    ],
  },
  "Problem Solving and Data Analysis": {
    order: 3,
    icon: "📊",
    color: "green",
    subtopics: [
      "Ratios and proportional relationships",
      "Percentages",
      "Unit conversion",
      "One-variable data (mean, median, standard deviation)",
      "Two-variable data (scatterplots, regression)",
      "Probability",
      "Statistical inference (margin of error concepts)",
    ],
  },
  "Geometry and Trigonometry": {
    order: 4,
    icon: "📏",
    color: "amber",
    subtopics: [
      "Area and volume",
      "Lines, angles, and triangles",
      "Similarity and congruence",
      "Right triangle trigonometry",
      "Circles (equations, arc length, sector area)",
      "Coordinate geometry",
    ],
  },
};

const RW_CONTENT_MAP: Record<
  string,
  { order: number; icon: string; color: string; subtopics: string[] }
> = {
  "Information and Ideas": {
    order: 1,
    icon: "📖",
    color: "blue",
    subtopics: [
      "Central Ideas and Details",
      "Inferences",
      "Command of Evidence",
      "Informational Graphics (tables, charts, graphs)",
    ],
  },
  "Craft and Structure": {
    order: 2,
    icon: "🧱",
    color: "purple",
    subtopics: [
      "Words in Context",
      "Text Structure and Purpose",
      "Cross-Text Connections",
    ],
  },
  "Expression of Ideas": {
    order: 3,
    icon: "✏️",
    color: "green",
    subtopics: ["Rhetorical Synthesis", "Transitions"],
  },
  "Standard English Conventions": {
    order: 4,
    icon: "✅",
    color: "amber",
    subtopics: [
      "Boundaries (run-ons, fragments, comma splices)",
      "Form, Structure, and Sense (verb tense, parallelism, modifiers, pronouns)",
      "Agreement (subject-verb, pronoun-antecedent)",
      "Punctuation (commas, semicolons, colons, dashes, apostrophes)",
    ],
  },
};

function topicDefaults(name: string, subject: string) {
  return {
    overview: `${name} — core SAT ${subject === "math" ? "Math" : "Reading & Writing"} skills.`,
    learning_objectives: [] as string[],
    sat_relevance: {
      questionCount: 0,
      percentageOfTest: 0,
      description: "Part of the official SAT blueprint.",
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
    description: `Practice and lessons for ${name}.`,
    difficulty: "medium",
    estimated_minutes: 30,
    learning_objectives: [] as string[],
    conceptual_overview: {} as Record<string, unknown>,
    key_formulas: [] as string[],
    common_mistakes: [] as string[],
    tips_and_tricks: [] as string[],
    prerequisite_subtopic_slugs: [] as string[],
  };
}

async function seedSubject(
  contentMap: typeof MATH_CONTENT_MAP,
  subject: "math" | "reading-writing"
) {
  let topicsAdded = 0;
  let subtopicsAdded = 0;

  for (const [topicName, meta] of Object.entries(contentMap)) {
    const topicSlug = slugify(topicName);
    const defaults = topicDefaults(topicName, subject);

    const { data: existingTopic } = await supabase
      .from("topics")
      .select("id")
      .eq("slug", topicSlug)
      .maybeSingle();

    let topicId = existingTopic?.id;

    if (!topicId) {
      const { data: inserted, error } = await supabase
        .from("topics")
        .insert({
          slug: topicSlug,
          name: topicName,
          subject,
          icon: meta.icon,
          order_index: meta.order,
          color_scheme: meta.color,
          ...defaults,
        })
        .select("id")
        .single();
      if (error) {
        console.error(`Topic ${topicName}:`, error.message);
        continue;
      }
      topicId = inserted.id;
      topicsAdded++;
      console.log(`+ topic: ${topicName}`);
    }

    for (let i = 0; i < meta.subtopics.length; i++) {
      const subName = meta.subtopics[i];
      const subSlug = slugify(subName);

      const { data: existingSub } = await supabase
        .from("subtopics")
        .select("id")
        .eq("topic_id", topicId)
        .eq("slug", subSlug)
        .maybeSingle();

      if (existingSub) continue;

      const { error } = await supabase.from("subtopics").insert({
        topic_id: topicId,
        slug: subSlug,
        name: subName,
        order_index: i,
        ...subtopicDefaults(subName),
      });
      if (error) {
        console.error(`  subtopic ${subName}:`, error.message);
        continue;
      }
      subtopicsAdded++;
      console.log(`  + subtopic: ${subName}`);
    }
  }

  return { topicsAdded, subtopicsAdded };
}

async function main() {
  console.log("Seeding SAT taxonomy (Math + Reading & Writing)...\n");

  // Legacy dev topic blocks order_index=1 for reading-writing SAT taxonomy.
  await supabase.from("topics").delete().eq("slug", "reading-comprehension");

  const math = await seedSubject(MATH_CONTENT_MAP, "math");
  const rw = await seedSubject(RW_CONTENT_MAP, "reading-writing");

  const { count: topicCount } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true });
  const { count: subCount } = await supabase
    .from("subtopics")
    .select("id", { count: "exact", head: true });

  console.log("\nDone.");
  console.log(
    `Added ${math.topicsAdded + rw.topicsAdded} topics, ${math.subtopicsAdded + rw.subtopicsAdded} subtopics this run.`
  );
  console.log(`DB now has ${topicCount} topics, ${subCount} subtopics.`);
  console.log(
    "\nNext: npm run seed:content:math  (generates ~40 SAT problems per subtopic via AI — takes a while)"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
