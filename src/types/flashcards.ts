type FlashcardOptionLetter = "A" | "B" | "C" | "D";

export type FlashcardOption = {
  letter: FlashcardOptionLetter;
  text: string;
};

type FlashcardFront = {
  questionText: string;
  questionPhonetic?: string;
  options: FlashcardOption[];
};

type FlashcardBack = {
  correctLetter: FlashcardOptionLetter;
  explanation: string;
  solutionSteps: string[];
};

export type Flashcard = {
  id: string;
  problemId: string;
  difficulty: string;
  front: FlashcardFront;
  back: FlashcardBack;
};

export type FlashcardDeckMeta = {
  topicSlug: string;
  subtopicSlug: string;
  topicName: string;
  subtopicName: string;
  requestedCount: number;
};
