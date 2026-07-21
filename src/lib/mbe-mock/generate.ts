import { MBE_SUBJECTS } from "@/lib/exam-config";
import {
  allocateMockExamSubjectCounts,
  MOCK_EXAM_QUESTION_COUNT,
} from "@/lib/mbe-mock/constants";

export type GeneratedMockQuestion = {
  subject: string;
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }
  return JSON.parse(raw);
}

function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function normalizeQuestions(
  questions: Record<string, unknown>[],
  subjectKey: string
): GeneratedMockQuestion[] {
  const normalized: GeneratedMockQuestion[] = [];

  for (const q of questions) {
    const options = Array.isArray(q.options)
      ? q.options.map((o) => String(o)).slice(0, 4)
      : [];
    if (options.length !== 4) continue;

    let correctOption = Number(q.correctOption);
    if (
      !Number.isFinite(correctOption) ||
      correctOption < 0 ||
      correctOption > 3
    ) {
      correctOption = 0;
    }

    const difficultyRaw = String(q.difficulty ?? "medium").toLowerCase();
    const difficulty =
      difficultyRaw === "easy" || difficultyRaw === "hard"
        ? difficultyRaw
        : "medium";

    const questionText = String(q.questionText ?? "").trim();
    if (questionText.length < 20) continue;

    normalized.push({
      subject: subjectKey,
      questionText,
      options,
      correctOption,
      explanation: String(q.explanation ?? "").trim() || "See answer key.",
      hint: String(q.hint ?? "").trim() || "Focus on the governing rule.",
      difficulty,
    });
  }

  return normalized;
}

async function generateSubjectBatch(
  apiKey: string,
  userId: string,
  subjectKey: string,
  subjectLabel: string,
  count: number
): Promise<GeneratedMockQuestion[]> {
  const prompt = `You are an expert Multistate Bar Examination (MBE) question writer.

Create exactly ${count} original multiple-choice questions for the subject "${subjectLabel}" (subject key: ${subjectKey}).

Rules:
- Each question is a realistic MBE-style fact pattern with one best answer among 4 options (A–D).
- Options must be an array of exactly 4 strings (do not prefix with A/B/C/D letters).
- correctOption is the 0-based index of the correct option (0–3).
- difficulty is one of: easy, medium, hard (mix across the set).
- Keep stems concise but exam-realistic. No copyrighted NCBE content.
- Every question's "subject" field must be exactly "${subjectKey}".
- Return ONLY valid JSON (no markdown) with this shape:
{
  "questions": [
    {
      "subject": "${subjectKey}",
      "questionText": "<stem>",
      "options": ["...", "...", "...", "..."],
      "correctOption": 0,
      "explanation": "<why the correct answer is right and others are wrong>",
      "hint": "<short hint without giving away the answer>",
      "difficulty": "medium"
    }
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
      metadata: { user_id: userId },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Anthropic mock exam generation failed for ${subjectLabel} (${res.status}): ${body.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const parsed = extractJson(text) as {
    questions?: Record<string, unknown>[];
  };

  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  return normalizeQuestions(questions, subjectKey).slice(0, count);
}

/** Generate a timed MBE-style mock set via Anthropic (no DB seed required). */
export async function generateMockExamQuestions(
  userId: string
): Promise<GeneratedMockQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const counts = allocateMockExamSubjectCounts();

  const batches = await Promise.all(
    MBE_SUBJECTS.map((subject) =>
      generateSubjectBatch(
        apiKey,
        userId,
        subject.key,
        subject.label,
        counts[subject.key] ?? 14
      )
    )
  );

  const usable = shuffle(batches.flat());
  if (usable.length < Math.floor(MOCK_EXAM_QUESTION_COUNT * 0.7)) {
    throw new Error(
      `Mock exam generation returned too few valid questions (${usable.length}/${MOCK_EXAM_QUESTION_COUNT})`
    );
  }

  return usable.slice(0, MOCK_EXAM_QUESTION_COUNT);
}
