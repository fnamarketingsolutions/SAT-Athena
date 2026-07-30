/**
 * Next's App Router percent-encodes dynamic segment values before handing them
 * to `useParams`, so a stored slug like `evidence-relevance-&-character` arrives
 * as `evidence-relevance-%26-character`. Interpolating the param back into a URL
 * is fine, but comparing it against a slug read from the database is not — decode
 * it first.
 */
export function decodeSlugParam(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    // Malformed escape sequences (a hand-typed URL) — match on the raw value.
    return value;
  }
}
