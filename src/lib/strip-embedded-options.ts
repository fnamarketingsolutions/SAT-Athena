/**
 * Some stored questions (mostly AI-generated) repeat the lettered answer
 * choices at the end of `questionText` even though the same choices live in
 * the `options` array. Quiz screens render the two separately, so those items
 * show every choice twice.
 *
 * The trailing block is only removed when the opening `A` marker starts a line
 * AND every lettered entry after it matches the corresponding option. That
 * guard keeps genuine lettered lists inside a prompt (e.g. "Statement A says
 * … Statement B says …", where the options are "A only", "A and B") intact.
 */

type Marker = { start: number; contentStart: number };

function letterFor(index: number): string {
  return String.fromCharCode(65 + index);
}

function normalize(value: string): string {
  return value
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.,:;]+$/, "");
}

function stripLeadingLetter(option: string): string {
  return option.replace(/^\s*\(?[A-Z][).:]\s+/, "");
}

/** First `letter` marker at or after `from`. The opening marker must begin a
 *  line; later ones may also sit inline when all choices share one line. */
function findMarker(
  text: string,
  letter: string,
  from: number,
  requireLineStart: boolean,
): Marker | null {
  const prefix = requireLineStart ? "(?:^|\\n)[ \\t]*" : "(?:^|\\n|[ \\t])";
  const pattern = new RegExp(`${prefix}\\(?${letter}[).:][ \\t]+`, "g");
  pattern.lastIndex = from;
  const match = pattern.exec(text);
  if (!match) return null;
  return { start: match.index, contentStart: match.index + match[0].length };
}

function segmentMatchesOption(segment: string, option: string): boolean {
  const expected = normalize(stripLeadingLetter(option));
  if (!expected) return false;
  return normalize(segment).startsWith(expected);
}

/** True when the text from `first` onward spells out every option in order. */
function optionsFollow(
  text: string,
  first: Marker,
  options: string[],
): boolean {
  let cursor = first.contentStart;
  for (let i = 0; i < options.length; i += 1) {
    const isLast = i === options.length - 1;
    const next = isLast
      ? null
      : findMarker(text, letterFor(i + 1), cursor, false);
    if (!isLast && !next) return false;
    const segment = text.slice(cursor, next ? next.start : text.length);
    if (!segmentMatchesOption(segment, options[i])) return false;
    if (next) cursor = next.contentStart;
  }
  return true;
}

/** Remove the duplicated answer-choice block from a question stem. Returns
 *  `questionText` unchanged when no such block is present. */
export function stripEmbeddedOptions(
  questionText: string,
  options: string[],
): string {
  const text = questionText ?? "";
  if (!text.trim() || options.length < 2) return text;

  let from = 0;
  while (from < text.length) {
    const first = findMarker(text, "A", from, true);
    if (!first) return text;
    if (optionsFollow(text, first, options)) {
      return text.slice(0, first.start).trim() || text;
    }
    from = first.contentStart;
  }
  return text;
}
