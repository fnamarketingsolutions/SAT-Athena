import { describe, expect, it } from "vitest";
import { stripEmbeddedOptions } from "@/lib/strip-embedded-options";

/**
 * Quiz screens render the stem and the `options` array separately, so a
 * question whose `questionText` also spells out A–D shows every choice twice.
 * The stripper removes that duplicate block, but only when the lettered
 * entries actually match the options.
 */

const JURISDICTION_OPTIONS = [
  "The court has jurisdiction because any case touching on patent validity necessarily arises under federal patent law.",
  "The court lacks jurisdiction because the cause of action is state breach of contract, and the federal issue arises only as a necessary element, not as the basis of the claim.",
  "The court has jurisdiction only if the patent invalidity defense is actually raised by the competitor in its answer.",
  "The court has jurisdiction if the federal question is necessarily raised, actually disputed, substantial, and its resolution in federal court would not disturb the balance of federal and state judicial responsibilities.",
];

describe("stripEmbeddedOptions", () => {
  it("removes a trailing A–D block that duplicates the options", () => {
    const stem =
      "A patent holder brought suit in federal district court against a competitor. Which of the following best states the proper analysis?";
    const questionText = `${stem}\n\nA. ${JURISDICTION_OPTIONS[0]}\nB. ${JURISDICTION_OPTIONS[1]}\nC. ${JURISDICTION_OPTIONS[2]}\nD. ${JURISDICTION_OPTIONS[3]}`;

    expect(stripEmbeddedOptions(questionText, JURISDICTION_OPTIONS)).toBe(stem);
  });

  it.each([
    ["parenthesised", "(A) Red\n(B) Blue\n(C) Green"],
    ["colon separated", "A: Red\nB: Blue\nC: Green"],
    ["indented", "  A) Red\n  B) Blue\n  C) Green"],
    ["inline after the first line", "A) Red B) Blue C) Green"],
  ])("handles %s markers", (_label, block) => {
    const questionText = `Pick a colour.\n${block}`;
    expect(stripEmbeddedOptions(questionText, ["Red", "Blue", "Green"])).toBe(
      "Pick a colour.",
    );
  });

  it("tolerates markdown emphasis and spacing differences", () => {
    const questionText =
      "Pick a colour.\n\nA.  **Red**\n\nB.  **Blue**\n\nC.  **Green**";
    expect(stripEmbeddedOptions(questionText, ["Red", "Blue", "Green"])).toBe(
      "Pick a colour.",
    );
  });

  it("keeps options that already carry their own letter prefix", () => {
    const questionText = "Pick a colour.\nA. Red\nB. Blue";
    expect(stripEmbeddedOptions(questionText, ["A. Red", "B. Blue"])).toBe(
      "Pick a colour.",
    );
  });

  it("keeps a lettered list that is part of the prompt", () => {
    const questionText =
      "Consider the statements below.\nA. The contract was signed.\nB. The contract was performed.\nWhich are true?";
    const options = ["A only", "B only", "Both A and B", "Neither"];

    expect(stripEmbeddedOptions(questionText, options)).toBe(questionText);
  });

  it("leaves a stem that never lists its options alone", () => {
    const questionText = "What is 2 + 2?";
    expect(stripEmbeddedOptions(questionText, ["3", "4", "5", "6"])).toBe(
      questionText,
    );
  });

  it("ignores an inline 'A.' that does not start an option block", () => {
    const questionText =
      "Party A. brought suit against Party B. Which claim survives?";
    const options = ["The first", "The second"];

    expect(stripEmbeddedOptions(questionText, options)).toBe(questionText);
  });

  it("returns the original text when stripping would empty the stem", () => {
    const questionText = "A. Red\nB. Blue";
    expect(stripEmbeddedOptions(questionText, ["Red", "Blue"])).toBe(
      questionText,
    );
  });

  it("passes through empty or single-option input", () => {
    expect(stripEmbeddedOptions("", ["Red", "Blue"])).toBe("");
    expect(stripEmbeddedOptions("Pick a colour.\nA. Red", ["Red"])).toBe(
      "Pick a colour.\nA. Red",
    );
  });
});
