import { describe, expect, it } from "vitest";
import { resolveProblemPassage, splitPassageAndStem } from "./parse-question";

describe("splitPassageAndStem", () => {
  it("splits on explicit delimiter", () => {
    const result = splitPassageAndStem(
      "Long passage text here.\n---\nWhich choice best states the main idea?"
    );
    expect(result.passage).toBe("Long passage text here.");
    expect(result.stem).toBe("Which choice best states the main idea?");
  });

  it("returns full text when no passage detected", () => {
    const result = splitPassageAndStem("What is 2 + 2?");
    expect(result.passage).toBeNull();
    expect(result.stem).toBe("What is 2 + 2?");
  });
});

describe("resolveProblemPassage", () => {
  it("prefers explicit passageText field", () => {
    const result = resolveProblemPassage({
      questionText: "Which choice is correct?",
      passageText: "The author argues that...",
    });
    expect(result.passage).toBe("The author argues that...");
    expect(result.stem).toBe("Which choice is correct?");
  });
});
