import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { classifyLessonPlanLocal, type ClassifierResponse } from "@/lib/lesson-plan/classify";
import { PROBLEM_SELECT_COLUMNS } from "@/lib/db/problem-columns";
import {
  getSeenProblemIds,
  getSeenProblemQuestionTexts,
  getWriteThroughBaseOrderIndex,
  markProblemsServed,
  persistGeneratedProblem,
  type ProblemLinkage,
} from "@/lib/db/queries/problem-stream";
import { buildRequestMetadata } from "@/lib/agent/request-metadata";
import { stemTokens, tooSimilar } from "@/lib/stem-similarity";
import type { SolutionStep } from "@/components/quiz/types";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import {
  EXAM_PROBLEM_SOURCES,
  isMbeSubject,
  type MbeSubject,
} from "@/lib/exam-config";

const AGENT_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8765";

const DEFAULT_MBE_SUBJECT: MbeSubject = "civil-procedure";

type ProblemRow = {
  id: string;
  order_index: number;
  difficulty: string;
  difficulty_level: number | null;
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string;
  solution_steps: { step: number; instruction: string; math: string }[];
  hint: string;
  detailed_hint: string | null;
  time_recommendation_seconds: number;
};

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function allocateCounts(weights: number[], total: number): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const effective = Math.max(total, n);
  const raw = weights.map((w) => w * effective);
  const floors = raw.map((x) => Math.floor(x));
  const remainder = effective - floors.reduce((a, b) => a + b, 0);
  const fracs = raw
    .map((v, i) => ({ frac: v - floors[i], idx: i }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) floors[fracs[k % n].idx] += 1;
  for (let i = 0; i < n; i++) {
    if (floors[i] === 0) {
      const donor = floors.indexOf(Math.max(...floors));
      if (floors[donor] > 1) {
        floors[donor] -= 1;
        floors[i] += 1;
      }
    }
  }
  return floors;
}

async function loadPracticeProblems(
  subtopicId: string,
  seenIds: Set<string>
): Promise<ProblemRow[]> {
  const { data, error } = await supabase
    .from("problems")
    .select(PROBLEM_SELECT_COLUMNS)
    .in("source", [...EXAM_PROBLEM_SOURCES])
    .eq("subtopic_id", subtopicId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("[lesson-plan] loadPracticeProblems:", error);
    return [];
  }
  return ((data ?? []) as ProblemRow[]).filter((p) => !seenIds.has(p.id));
}

type GeneratedProblem = {
  id: string;
  difficulty: string;
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  solutionSteps: SolutionStep[];
  hint: string;
  detailedHint?: string;
  timeRecommendationSeconds?: number;
};

/**
 * Top up a subtopic's pool by generating the deficit via the Python agent,
 * writing each problem through to the DB so it earns a real UUID and is
 * deduped against what we already have. Returns rows in the DB `ProblemRow`
 * shape so they can flow through `mapProblemRow` like seeded problems.
 */
async function generateProblemRows(params: {
  topicName: string;
  subtopicName: string;
  subject: string;
  deficit: number;
  linkage: ProblemLinkage;
  clerkId: string;
  topicSlug: string;
  subtopicSlug: string;
  priorQuestionTexts: string[];
}): Promise<ProblemRow[]> {
  const {
    topicName,
    subtopicName,
    subject,
    deficit,
    linkage,
    clerkId,
    topicSlug,
    subtopicSlug,
    priorQuestionTexts,
  } = params;

  if (deficit <= 0) return [];

  const priorStems = priorQuestionTexts.map((t) => stemTokens(t));
  const out: ProblemRow[] = [];

  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}/practice-problems/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topicName,
        subtopic: subtopicName,
        subject,
        count: deficit,
        prior_answers: [],
        request_metadata: buildRequestMetadata({
          userId: clerkId,
          topic: topicSlug || null,
          subtopic: subtopicSlug || null,
          lessonId: null,
        }),
      }),
    });
  } catch (err) {
    console.warn("[lesson-plan] agent generate unavailable:", err);
    return [];
  }

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => "");
    console.warn(
      `[lesson-plan] agent generate failed (${res.status}):`,
      errBody.slice(0, 200)
    );
    return [];
  }

  let orderIndex = await getWriteThroughBaseOrderIndex(linkage);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      let parsed: { problem?: GeneratedProblem };
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }
      const g = parsed.problem;
      if (!g) continue;

      const stem = stemTokens(g.questionText);
      if (tooSimilar(stem, priorStems)) continue;
      priorStems.push(stem);

      const realId = await persistGeneratedProblem({
        problem: {
          questionText: g.questionText,
          questionPhonetic: null,
          options: g.options,
          correctOption: g.correctOption,
          explanation: g.explanation,
          solutionSteps: g.solutionSteps,
          hint: g.hint,
          detailedHint: g.detailedHint ?? null,
          difficulty: g.difficulty,
          timeRecommendationSeconds: g.timeRecommendationSeconds,
        },
        linkage,
        orderIndex: orderIndex++,
      });

      out.push({
        id: realId ?? g.id,
        order_index: orderIndex,
        difficulty: g.difficulty,
        difficulty_level: null,
        question_text: g.questionText,
        options: g.options,
        correct_option: g.correctOption,
        explanation: g.explanation,
        solution_steps: g.solutionSteps,
        hint: g.hint,
        detailed_hint: g.detailedHint ?? null,
        time_recommendation_seconds: g.timeRecommendationSeconds ?? 90,
      });

      if (out.length >= deficit) break outer;
    }
  }

  try {
    await reader.cancel();
  } catch {
    /* already done */
  }

  return out;
}

function mapProblemRow(
  p: ProblemRow,
  i: number,
  topicSlug: string,
  subtopicSlug: string
) {
  return {
    id: p.id,
    orderIndex: i,
    difficulty: p.difficulty,
    difficultyLevel: p.difficulty_level,
    questionText: p.question_text,
    questionPhonetic: undefined,
    options: p.options,
    correctOption: p.correct_option,
    explanation: p.explanation,
    solutionSteps: p.solution_steps,
    hint: p.hint,
    detailedHint: p.detailed_hint ?? undefined,
    timeRecommendationSeconds: p.time_recommendation_seconds,
    topicSlug,
    subtopicSlug,
  };
}

export async function POST(req: Request) {
  const { userId: clerkId } = await getAuthIdentity();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(clerkId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const seenIds = await getSeenProblemIds(user.id);
  const seenQuestionTexts = await getSeenProblemQuestionTexts(seenIds);

  const body = (await req.json().catch(() => ({}))) as {
    plan?: string;
    count?: number;
    topicSlug?: string;
    subtopicSlug?: string;
  };
  const topicSlug = typeof body.topicSlug === "string" ? body.topicSlug : "";
  const subtopicSlug =
    typeof body.subtopicSlug === "string" ? body.subtopicSlug : "";
  const plan = typeof body.plan === "string" ? body.plan.trim() : "";
  if (!plan) {
    return NextResponse.json({ error: "plan is required" }, { status: 400 });
  }
  const count =
    typeof body.count === "number" && Number.isFinite(body.count)
      ? Math.max(1, Math.min(20, Math.floor(body.count)))
      : 5;

  // Fast path — if the caller already knows the taxonomy slugs, skip the
  // LLM classifier entirely and pull problems directly.
  if (topicSlug && subtopicSlug) {
    const { data: topic } = await supabase
      .from("topics")
      .select("id, slug, name, subject")
      .eq("slug", topicSlug)
      .limit(1)
      .maybeSingle();
    if (topic) {
      const { data: subtopic } = await supabase
        .from("subtopics")
        .select("id, slug, name")
        .eq("topic_id", topic.id)
        .eq("slug", subtopicSlug)
        .limit(1)
        .maybeSingle();

      if (subtopic) {
        const subject: MbeSubject = isMbeSubject(topic.subject)
          ? topic.subject
          : DEFAULT_MBE_SUBJECT;

        const pool = await loadPracticeProblems(subtopic.id, seenIds);
        const picks = shuffle(pool).slice(0, count);

        // Seeded pool is small (~3/subtopic); generate the shortfall via the
        // agent so the learner actually gets the count they asked for.
        if (picks.length < count) {
          const generated = await generateProblemRows({
            topicName: topic.name,
            subtopicName: subtopic.name,
            subject,
            deficit: count - picks.length,
            linkage: { subtopicId: subtopic.id, topicSlug: topic.slug, subtopicSlug: subtopic.slug },
            clerkId,
            topicSlug: topic.slug,
            subtopicSlug: subtopic.slug,
            priorQuestionTexts: [
              ...seenQuestionTexts,
              ...picks.map((p) => p.question_text),
            ],
          });
          picks.push(...generated);
        }

        const problems = picks.map((p, i) =>
          mapProblemRow(p, i, topic.slug, subtopic.slug)
        );

        if (problems.length === 0) {
          return NextResponse.json(
            {
              error: `No bar exam practice problems found for ${topicSlug}/${subtopicSlug}.`,
            },
            { status: 404 }
          );
        }

        // Mark served immediately so these MCQs never repeat for this student.
        await markProblemsServed({
          userId: user.id,
          problemIds: problems.map((p) => p.id),
          subtopicId: subtopic.id,
        });

        return NextResponse.json({
          classification: {
            subject,
            matches: [
              {
                topicSlug: topic.slug,
                topicName: topic.name,
                subtopicSlug: subtopic.slug,
                subtopicName: subtopic.name,
                subtopicId: subtopic.id,
                weight: 1,
                problemCount: problems.length,
                rationale: "Direct taxonomy match (skipped classifier).",
              },
            ],
            notes: null,
          },
          problems,
        });
      }
    }
    return NextResponse.json(
      {
        error: `Could not find subtopic ${topicSlug}/${subtopicSlug} in the taxonomy.`,
      },
      { status: 404 }
    );
  }

  // Step 1 — classify the plan (local Anthropic by default; optional Python agent).
  let classification: ClassifierResponse;
  const useAgent = process.env.USE_AGENT_CLASSIFIER === "true";

  async function classifyViaAgent(): Promise<ClassifierResponse> {
    const res = await fetch(`${AGENT_URL}/lesson-plan/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        request_metadata: { user_id: clerkId },
      }),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "no body");
      throw new Error(`classify failed ${res.status}: ${errorBody}`);
    }
    return (await res.json()) as ClassifierResponse;
  }

  try {
    if (useAgent) {
      try {
        classification = await classifyViaAgent();
      } catch (err) {
        console.warn(
          "[api/lesson-plan/practice-problems] agent classify unavailable, trying local fallback:",
          err
        );
        classification = await classifyLessonPlanLocal(plan, clerkId);
      }
    } else {
      classification = await classifyLessonPlanLocal(plan, clerkId);
    }
  } catch (fallbackErr) {
    console.error(
      "[api/lesson-plan/practice-problems] classify error:",
      fallbackErr
    );
    return NextResponse.json(
      {
        error:
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "Failed to classify lesson plan.",
      },
      { status: 503 }
    );
  }

  if (!classification.matches || classification.matches.length === 0) {
    return NextResponse.json({
      classification: {
        subject: classification.subject,
        matches: [],
        notes: classification.notes,
      },
      problems: [],
    });
  }

  // Step 2 — resolve subtopic slugs to ids + names, in parallel.
  const lookups = await Promise.all(
    classification.matches.map(async (m) => {
      const { data: topic } = await supabase
        .from("topics")
        .select("id, slug, name")
        .eq("slug", m.topicSlug)
        .limit(1)
        .maybeSingle();
      if (!topic) return null;
      const { data: subtopic } = await supabase
        .from("subtopics")
        .select("id, slug, name")
        .eq("topic_id", topic.id)
        .eq("slug", m.subtopicSlug)
        .limit(1)
        .maybeSingle();
      if (!subtopic) return null;
      return { match: m, topic, subtopic };
    })
  );
  const resolved = lookups.filter(
    (x): x is NonNullable<typeof x> => x !== null
  );

  if (resolved.length === 0) {
    return NextResponse.json({
      classification: {
        subject: classification.subject,
        matches: [],
        notes:
          classification.notes ??
          "Matched subtopic(s) not found in the taxonomy.",
      },
      problems: [],
    });
  }

  // Step 3 — allocate problem counts per match by weight, then fetch
  // existing MBE practice problems for each subtopic and sample.
  const weights = resolved.map((r) => r.match.weight);
  const allocations = allocateCounts(weights, count);

  const genSubject: MbeSubject = isMbeSubject(classification.subject)
    ? (classification.subject as MbeSubject)
    : DEFAULT_MBE_SUBJECT;

  const sampled = await Promise.all(
    resolved.map(async (r, i) => {
      const need = allocations[i];
      if (need <= 0) return { match: r, problems: [] as ProblemRow[] };
      const pool = await loadPracticeProblems(r.subtopic.id, seenIds);
      const picks = shuffle(pool).slice(0, need);

      // Top up the seeded shortfall with freshly generated problems.
      if (picks.length < need) {
        const generated = await generateProblemRows({
          topicName: r.topic.name,
          subtopicName: r.subtopic.name,
          subject: genSubject,
          deficit: need - picks.length,
          linkage: {
            subtopicId: r.subtopic.id,
            topicSlug: r.topic.slug,
            subtopicSlug: r.subtopic.slug,
          },
          clerkId,
          topicSlug: r.topic.slug,
          subtopicSlug: r.subtopic.slug,
          priorQuestionTexts: [
            ...seenQuestionTexts,
            ...picks.map((p) => p.question_text),
          ],
        });
        picks.push(...generated);
      }

      return { match: r, problems: picks };
    })
  );

  // Step 4 — assemble response in the existing `Problem` shape and
  // shuffle once more so subtopics interleave instead of clustering.
  const flat: Array<ProblemRow & { topicSlug: string; subtopicSlug: string }> =
    [];
  for (const { match, problems } of sampled) {
    for (const p of problems) {
      flat.push({
        ...p,
        topicSlug: match.match.topicSlug,
        subtopicSlug: match.match.subtopicSlug,
      });
    }
  }
  const shuffled = shuffle(flat);

  const problems = shuffled.map((p, i) => ({
    id: p.id,
    orderIndex: i,
    difficulty: p.difficulty,
    difficultyLevel: p.difficulty_level,
    questionText: p.question_text,
    questionPhonetic: undefined,
    options: p.options,
    correctOption: p.correct_option,
    explanation: p.explanation,
    solutionSteps: p.solution_steps,
    hint: p.hint,
    detailedHint: p.detailed_hint ?? undefined,
    timeRecommendationSeconds: p.time_recommendation_seconds,
    topicSlug: p.topicSlug,
    subtopicSlug: p.subtopicSlug,
  }));

  if (problems.length > 0) {
    await markProblemsServed({
      userId: user.id,
      problemIds: problems.map((p) => p.id),
      subtopicId:
        resolved.length === 1 ? resolved[0].subtopic.id : null,
    });
  }

  const matches = resolved.map((r, i) => ({
    topicSlug: r.topic.slug,
    topicName: r.topic.name,
    subtopicSlug: r.subtopic.slug,
    subtopicName: r.subtopic.name,
    subtopicId: r.subtopic.id,
    weight: r.match.weight,
    problemCount: sampled[i].problems.length,
    rationale: r.match.rationale,
  }));

  return NextResponse.json({
    classification: {
      subject: classification.subject,
      matches,
      notes: classification.notes,
    },
    problems,
  });
}
