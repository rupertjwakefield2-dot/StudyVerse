import type { AIProvider } from "./types";
import { MockProvider } from "./mock";
import { AnthropicProvider } from "./anthropic";

let cached: AIProvider | null = null;

/**
 * The single entry point for AI. Swap models/providers entirely via env —
 * nothing else in the app needs to change.
 */
export function getAI(): AIProvider {
  if (cached) return cached;

  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();
  const model = process.env.AI_MODEL || "claude-sonnet-4-6";
  const key = process.env.ANTHROPIC_API_KEY;

  if (provider === "anthropic" && key) {
    cached = new AnthropicProvider(key, model);
  } else {
    cached = new MockProvider();
  }
  return cached;
}

export * from "./types";
