import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  DetectMeta,
  Difficulty,
  FlashcardResponse,
  QuizResponse,
  TutorRequest,
  TutorResponse,
} from "./types";
import {
  DETECT_SYSTEM,
  FLASHCARD_SYSTEM,
  QUIZ_SYSTEM,
  TUTOR_SYSTEM,
  flashcardSchemaHint,
  quizSchemaHint,
  tutorSchemaHint,
} from "./prompts";
import { MockProvider } from "./mock";

/**
 * Real provider backed by Claude. Falls back to the mock heuristics if the
 * model returns something unparseable, so the product never hard-fails.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;
  private fallback = new MockProvider();

  constructor(apiKey: string, model = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  private async json<T>(system: string, user: string, maxTokens = 1400): Promise<T | null> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("");
      return extractJson<T>(text);
    } catch (err) {
      console.error("[anthropic] request failed:", (err as Error).message);
      return null;
    }
  }

  async tutor(req: TutorRequest): Promise<TutorResponse> {
    const context = [
      req.subject ? `Subject: ${req.subject}` : "",
      req.topic ? `Topic: ${req.topic}` : "",
      req.sourceText ? `Material:\n${req.sourceText.slice(0, 4000)}` : "",
      `Learner's question:\n${req.question}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const user = `${context}\n\n${tutorSchemaHint(req.mode, req.difficulty)}`;
    const out = await this.json<TutorResponse>(TUTOR_SYSTEM, user, 1600);
    if (out && Array.isArray(out.steps)) return { ...out, mode: req.mode, difficulty: req.difficulty };
    return this.fallback.tutor(req);
  }

  async generateQuiz(opts: {
    sourceText: string;
    subject?: string;
    topic?: string;
    difficulty: Difficulty;
    count: number;
  }): Promise<QuizResponse> {
    const user = `Material:\n${opts.sourceText.slice(0, 6000)}\n\n${quizSchemaHint(opts.count, opts.difficulty)}`;
    const out = await this.json<QuizResponse>(QUIZ_SYSTEM, user, 2400);
    if (out && Array.isArray(out.questions) && out.questions.length) return out;
    return this.fallback.generateQuiz(opts);
  }

  async generateFlashcards(opts: {
    sourceText: string;
    subject?: string;
    count: number;
  }): Promise<FlashcardResponse> {
    const user = `Material:\n${opts.sourceText.slice(0, 6000)}\n\n${flashcardSchemaHint(opts.count)}`;
    const out = await this.json<FlashcardResponse>(FLASHCARD_SYSTEM, user, 2000);
    if (out && Array.isArray(out.cards) && out.cards.length) return out;
    return this.fallback.generateFlashcards(opts);
  }

  async detect(text: string): Promise<DetectMeta> {
    const out = await this.json<DetectMeta>(DETECT_SYSTEM, text.slice(0, 2000), 200);
    if (out && out.subject) return out;
    return this.fallback.detect(text);
  }
}

/** Pull the first balanced JSON object out of a model response. */
function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === "{") depth++;
    else if (candidate[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
