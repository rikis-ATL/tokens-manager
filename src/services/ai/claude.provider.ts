import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, Message, ChatOptions } from "./provider.interface";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return response.content
      .filter(block => block.type === "text")
      .map(block => (block as Anthropic.TextBlock).text)
      .join("");
  }
}
