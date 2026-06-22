// Structured AI contracts. Every provider returns these exact shapes so the UI
// and the rest of the system never depend on a specific model.

export type LearningMode = "guided" | "hint" | "quiz";
export type Difficulty = "easy" | "medium" | "hard";

export interface TutorRequest {
  question: string;
  mode: LearningMode;
  difficulty: Difficulty;
  subject?: string;
  topic?: string;
  sourceText?: string; // OCR / pasted / uploaded material
  /** Conversation so far, for the voice/chat coach. */
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface TutorStep {
  title: string;
  detail: string;
}

/** The structured tutor output rendered in the study panel. */
export interface TutorResponse {
  mode: LearningMode;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  /** One-line restatement of what we're solving. */
  restate: string;
  /** Guided mode: full worked steps. Hint mode: partial clues only. */
  steps: TutorStep[];
  /** Quiz mode: a probing question back to the learner. */
  checkQuestion?: string;
  /** Short, plain-language takeaway. */
  keyIdea: string;
  /** What to revise next (drives the adaptive engine). */
  followUpTopics: string[];
  /** A natural-language version for the voice tutor to read aloud. */
  speech: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
}

export interface QuizResponse {
  title: string;
  subject: string;
  topic: string;
  questions: QuizQuestion[];
}

export interface FlashcardDraft {
  front: string;
  back: string;
  topic: string;
}

export interface FlashcardResponse {
  title: string;
  subject: string;
  cards: FlashcardDraft[];
}

export interface DetectMeta {
  subject: string;
  topic: string;
  difficulty: Difficulty;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  tutor(req: TutorRequest): Promise<TutorResponse>;
  generateQuiz(opts: {
    sourceText: string;
    subject?: string;
    topic?: string;
    difficulty: Difficulty;
    count: number;
  }): Promise<QuizResponse>;
  generateFlashcards(opts: {
    sourceText: string;
    subject?: string;
    count: number;
  }): Promise<FlashcardResponse>;
  detect(text: string): Promise<DetectMeta>;
}
