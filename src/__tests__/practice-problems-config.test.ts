import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRACTICE_SUBJECT,
  resolvePracticeSubject,
} from "@/lib/agent/practice-problems-config";

describe("resolvePracticeSubject", () => {
  it("returns the provided subject when present", () => {
    expect(resolvePracticeSubject("torts")).toBe("torts");
  });

  it("falls back to the default MBE subject", () => {
    expect(resolvePracticeSubject()).toBe(DEFAULT_PRACTICE_SUBJECT);
    expect(resolvePracticeSubject(null)).toBe(DEFAULT_PRACTICE_SUBJECT);
  });
});
