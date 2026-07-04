import { describe, expect, it } from "vitest";
import { hasDebugFlag, parseDebugFlags } from "@/lib/debug/search-params";

describe("parseDebugFlags", () => {
  it("parses comma-separated debug flags", () => {
    const flags = parseDebugFlags("ops, freeze ,orb");
    expect(hasDebugFlag(flags, "ops")).toBe(true);
    expect(hasDebugFlag(flags, "freeze")).toBe(true);
    expect(hasDebugFlag(flags, "orb")).toBe(true);
    expect(hasDebugFlag(flags, "v2")).toBe(false);
  });

  it("returns an empty set for nullish input", () => {
    expect(parseDebugFlags(null).size).toBe(0);
    expect(parseDebugFlags(undefined).size).toBe(0);
  });
});
