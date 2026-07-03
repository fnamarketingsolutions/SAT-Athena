import { FlashcardDeckView } from "@/components/flashcards/flashcard-deck-view";

export default async function FlashcardsPage({
  params,
}: {
  params: Promise<{ topicSlug: string; subtopicSlug: string }>;
}) {
  const { topicSlug, subtopicSlug } = await params;
  // Slugs can contain "&" (e.g. "jurisdiction-&-venue"), which the browser
  // percent-encodes to "%26" in the URL. Decode so it matches DB slugs.
  const decodedTopic = safeDecode(topicSlug);
  const decodedSubtopic = safeDecode(subtopicSlug);
  return (
    <FlashcardDeckView
      topicSlug={decodedTopic}
      subtopicSlug={decodedSubtopic}
    />
  );
}

function safeDecode(value: string): string {
  try {
    let out = value;
    // Decode repeatedly to handle accidental double-encoding (%2526 → %26 → &).
    while (/%[0-9A-Fa-f]{2}/.test(out)) {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    }
    return out;
  } catch {
    return value;
  }
}
