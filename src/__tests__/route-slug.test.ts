import { describe, expect, it } from "vitest";
import { decodeSlugParam } from "@/lib/route-slug";

/**
 * Most MBE topic and subtopic slugs contain `&` or an em dash, and the App
 * Router percent-encodes dynamic segment values on the way into `useParams`.
 * Matching the param against a slug loaded from the database therefore has to
 * decode first, otherwise every one of those topics silently misses.
 */

const STORED_SLUGS = [
  "contracts",
  "civil-procedure-pleadings-&-discovery",
  "real-property-land-transactions-&-nonpossessory-interests",
  "constitutional-law-individual-rights-—-due-process",
];

describe("decodeSlugParam", () => {
  it.each(STORED_SLUGS)("matches the stored slug %s", (slug) => {
    expect(decodeSlugParam(encodeURIComponent(slug))).toBe(slug);
  });

  it("leaves an already-decoded param alone", () => {
    expect(decodeSlugParam("civil-procedure-pleadings-&-discovery")).toBe(
      "civil-procedure-pleadings-&-discovery",
    );
  });

  it("falls back to the raw value for a malformed escape sequence", () => {
    expect(decodeSlugParam("100%-torts")).toBe("100%-torts");
  });

  it("returns an empty string when the param is missing", () => {
    expect(decodeSlugParam(undefined)).toBe("");
  });
});
