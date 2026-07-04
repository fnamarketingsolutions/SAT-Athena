/** Parse comma-separated `?debug=` flags, e.g. `?debug=ops,freeze`. */
export function parseDebugFlags(raw: string | null | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function hasDebugFlag(
  flags: Set<string>,
  name: string
): boolean {
  return flags.has(name);
}
