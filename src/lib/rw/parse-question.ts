/**
 * Split a combined R&W problem into passage + question stem.
 * Supports explicit delimiters and common SAT-style layouts.
 */
export function splitPassageAndStem(questionText: string): {
  passage: string | null;
  stem: string;
} {
  const text = questionText.trim();
  if (!text) return { passage: null, stem: "" };

  const explicitDelim = text.match(/^([\s\S]+?)\n\s*---\s*\n\s*([\s\S]+)$/);
  if (explicitDelim) {
    return {
      passage: explicitDelim[1].trim(),
      stem: explicitDelim[2].trim(),
    };
  }

  const labeled = text.match(
    /^Passage:\s*\n([\s\S]+?)\n\s*(?:Question:|Stem:)\s*\n([\s\S]+)$/i
  );
  if (labeled) {
    return { passage: labeled[1].trim(), stem: labeled[2].trim() };
  }

  const stemLead =
    /\n\n((?:Which (?:choice|of the following)|What is the|Based on the (?:passage|text)|According to the (?:passage|text)|The author(?:'s)?|As used in (?:line|the passage)|The main (?:idea|purpose)|Which statement)[\s\S]*)$/i;
  const stemMatch = text.match(stemLead);
  if (stemMatch && stemMatch.index !== undefined && stemMatch.index > 120) {
    const passage = text.slice(0, stemMatch.index).trim();
    const stem = stemMatch[1].trim();
    if (passage.length >= 80) {
      return { passage, stem };
    }
  }

  return { passage: null, stem: text };
}

export function resolveProblemPassage(problem: {
  questionText: string;
  passageText?: string | null;
}): { passage: string | null; stem: string } {
  if (problem.passageText?.trim()) {
    return {
      passage: problem.passageText.trim(),
      stem: problem.questionText.trim(),
    };
  }
  return splitPassageAndStem(problem.questionText);
}
