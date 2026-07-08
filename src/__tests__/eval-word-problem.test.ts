import { describe, expect, it } from "vitest";
import { evaluateAdherence } from "@/lib/evals/adherence";
import { acceptLesson } from "@/lib/evals/accept";
import type { GeometryAction, WhiteboardStep } from "@/types/whiteboard";

/**
 * Pins evaluateAdherence guardrails for lesson quality:
 *   - word_problem action-shape validation
 *   - unstructured word-problem detection (write_text masquerading as scenarios)
 *   - dangling orbFocus parts that don't resolve against geometry
 */

const TRIANGLE: GeometryAction = {
  type: "geometry",
  figures: [
    {
      type: "polygon",
      vertices: [
        { x: 0, y: 100 },
        { x: 0, y: 0 },
        { x: 80, y: 100 },
      ],
      vertexLabels: ["A", "B", "C"],
    },
  ],
  labels: [{ text: "13", position: { x: 40, y: 50 } }],
};

function makeStep(
  id: number,
  action: WhiteboardStep["action"],
  extras: Partial<WhiteboardStep> = {},
): WhiteboardStep {
  return {
    id,
    delayMs: 0,
    durationMs: 0,
    action,
    ...extras,
  };
}

describe("word_problem action-shape check", () => {
  it("passes for a well-formed word_problem step", () => {
    const step = makeStep(0, {
      type: "word_problem",
      prose: "A store sells widgets for two dollars each.",
      variables: [{ symbol: "n", meaning: "the number of widgets" }],
      equation: "2n = T",
    });
    const m = evaluateAdherence([step]);
    expect(m.actionShapeViolations).toEqual([]);
  });

  it("flags missing prose", () => {
    const step = makeStep(7, {
      type: "word_problem",
      prose: "",
      variables: [{ symbol: "x", meaning: "stuff" }],
      equation: "x = 1",
    });
    const m = evaluateAdherence([step]);
    expect(m.actionShapeViolations.length).toBe(1);
    expect(m.actionShapeViolations[0]).toMatchObject({
      stepId: 7,
      actionType: "word_problem",
    });
    expect(m.actionShapeViolations[0].reasons.join(" ")).toMatch(/prose/);
  });

  it("flags missing variables array", () => {
    const step = makeStep(3, {
      type: "word_problem",
      prose: "hello",
      variables: [],
      equation: "x = 1",
    });
    const m = evaluateAdherence([step]);
    expect(m.actionShapeViolations[0]?.reasons.join(" ")).toMatch(/variables/);
  });

  it("flags variable rows missing symbol or meaning", () => {
    const step = makeStep(9, {
      type: "word_problem",
      prose: "hello",
      variables: [{ symbol: "", meaning: "x" }, { symbol: "y", meaning: "" }],
      equation: "x = 1",
    });
    const m = evaluateAdherence([step]);
    const reasons = m.actionShapeViolations[0]?.reasons ?? [];
    expect(reasons.some((r) => /\[0\].*symbol/.test(r))).toBe(true);
    expect(reasons.some((r) => /\[1\].*meaning/.test(r))).toBe(true);
  });
});

describe("unstructured word-problem detection", () => {
  // A step that has all the hallmarks of a word problem but was authored
  // as raw write_text — exactly what the gate should catch.
  const unstructured = makeStep(0, {
    type: "write_text",
    text:
      "Sarah is selling lemonade for \\$2 per cup. She wants to earn \\$40 in total. How many cups must she sell to reach her goal? Help Sarah figure out the answer.",
  });

  it("flags a write_text step with currency + named subject + quantitative noun + question", () => {
    const m = evaluateAdherence([unstructured]);
    expect(m.wordProblems.unstructuredCandidates.length).toBe(1);
    expect(m.wordProblems.unstructuredCandidates[0].stepId).toBe(0);
    // Must surface multiple distinct signals so the model can self-correct.
    expect(
      m.wordProblems.unstructuredCandidates[0].reasons.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("hard-fails the accept gate when an unstructured candidate exists", () => {
    const m = evaluateAdherence([unstructured]);
    const result = acceptLesson(m, null);
    expect(result.pass).toBe(false);
    expect(result.reasons.some((r) => /word problem/i.test(r))).toBe(true);
  });

  it("does NOT flag a short non-word-problem write_text step", () => {
    const step = makeStep(0, {
      type: "write_text",
      text: "Now we solve for x by isolating it on the left.",
    });
    const m = evaluateAdherence([step]);
    expect(m.wordProblems.unstructuredCandidates).toEqual([]);
  });

  it("does NOT flag a long algebraic explanation without scenario signals", () => {
    const step = makeStep(0, {
      type: "write_text",
      text:
        "To solve this linear equation we will use inverse operations. First we isolate the variable term by undoing the addition. Then we divide both sides by the coefficient. Finally we check the answer by substituting back.",
    });
    const m = evaluateAdherence([step]);
    expect(m.wordProblems.unstructuredCandidates).toEqual([]);
  });

  it("does NOT flag a structured word_problem step (the correct path)", () => {
    const step = makeStep(0, {
      type: "word_problem",
      prose:
        "Sarah is selling lemonade for \\$2 per cup. She wants to earn \\$40 in total. How many cups must she sell to reach her goal?",
      variables: [{ symbol: "x", meaning: "the number of cups Sarah sells" }],
      equation: "2x = 40",
    });
    const m = evaluateAdherence([step]);
    expect(m.wordProblems.unstructuredCandidates).toEqual([]);
    expect(m.wordProblems.count).toBe(1);
    expect(m.wordProblems.stepIds).toEqual([0]);
  });

  it("requires at least 2 signals to trip — single signals are not enough", () => {
    // Just a named subject + question, no currency / quantitative noun.
    // (Below the 25-word floor anyway, but doubly safe.)
    const step = makeStep(0, {
      type: "write_text",
      text:
        "Sarah was thinking about her next move and wondered what to do. She had a long day. She was tired. She had no idea. She gave up. She rested. She slept.",
    });
    const m = evaluateAdherence([step]);
    expect(m.wordProblems.unstructuredCandidates).toEqual([]);
  });
});

describe("dangling orb-focus detection", () => {
  it("passes when the part resolves against the most recent geometry step", () => {
    const steps = [
      makeStep(0, TRIANGLE),
      makeStep(1, { type: "write_text", text: "C is the right angle." } as WhiteboardStep["action"], {
        orbFocus: { part: "C" },
      }),
      makeStep(2, { type: "write_text", text: "The hypotenuse is 13." } as WhiteboardStep["action"], {
        orbFocus: { part: "13" },
      }),
    ];
    expect(evaluateAdherence(steps).danglingOrbFocus).toEqual([]);
  });

  it("flags a part name not present on the shape", () => {
    const steps = [
      makeStep(0, TRIANGLE),
      makeStep(1, { type: "write_text", text: "Look at Z." } as WhiteboardStep["action"], {
        orbFocus: { part: "Z" },
      }),
    ];
    const d = evaluateAdherence(steps).danglingOrbFocus;
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ stepId: 1, part: "Z" });
  });

  it("flags an orbFocus with no geometry shape to point at", () => {
    const steps = [
      makeStep(0, { type: "write_math", latex: "x = 1" } as WhiteboardStep["action"]),
      makeStep(1, { type: "write_text", text: "Look at C." } as WhiteboardStep["action"], {
        orbFocus: { part: "C" },
      }),
    ];
    const d = evaluateAdherence(steps).danglingOrbFocus;
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ stepId: 1, part: "C" });
  });

  it("ignores steps without orbFocus", () => {
    const steps = [makeStep(0, TRIANGLE), makeStep(1, { type: "write_text", text: "hi" } as WhiteboardStep["action"])];
    expect(evaluateAdherence(steps).danglingOrbFocus).toEqual([]);
  });
});
