import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ChatResult, Message, ChatOptions } from "./provider.interface";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResult> {
    // Build Anthropic-format messages from our Message[] type
    const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Tool use loop: call API, if tool_use response, execute tools, append results, call again
    const MAX_TOOL_ROUNDS = 10; // safety limit to prevent infinite loops
    let toolsExecuted = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.client.messages.create({
        model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
        messages: anthropicMessages,
        ...(options?.tools && options.tools.length > 0 ? { tools: options.tools as Anthropic.Tool[] } : {}),
      });

      // If no tool use requested, extract text and return
      if (response.stop_reason !== "tool_use" || !options?.toolExecutor) {
        return {
          reply: response.content
            .filter(block => block.type === "text")
            .map(block => (block as Anthropic.TextBlock).text)
            .join(""),
          toolsExecuted,
        };
      }

      // Extract tool_use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        return {
          reply: response.content
            .filter(block => block.type === "text")
            .map(block => (block as Anthropic.TextBlock).text)
            .join(""),
          toolsExecuted,
        };
      }

      // Tools are being executed this round
      toolsExecuted = true;

      // Append assistant's response (including tool_use blocks) to messages
      anthropicMessages.push({ role: "assistant", content: response.content });

      // Execute each tool and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await options.toolExecutor(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Append tool results as a user message
      anthropicMessages.push({ role: "user", content: toolResults });
    }

    // If we hit MAX_TOOL_ROUNDS, return whatever text we have
    return {
      reply: "I apologize, but I hit the maximum number of tool call rounds. Please try a simpler request.",
      toolsExecuted,
    };
  }
}
