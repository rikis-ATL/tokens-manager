import { ClaudeProvider } from "./claude.provider";
import { decrypt } from "@/lib/ai/encryption";
import type { AIProvider, ChatResult, Message, ChatOptions } from "./provider.interface";

export class AIService {
  private getProvider(userEncryptedKey?: string, userIv?: string): AIProvider {
    if (process.env.SELF_HOSTED === "true") {
      const serverKey = process.env.ANTHROPIC_API_KEY;
      if (!serverKey) throw new Error("ANTHROPIC_API_KEY not configured on server");
      return new ClaudeProvider(serverKey);
    }

    if (userEncryptedKey && userIv) {
      const apiKey = decrypt(userEncryptedKey, userIv);
      return new ClaudeProvider(apiKey);
    }

    throw new Error("No API key available");
  }

  async chat(
    messages: Message[],
    options?: ChatOptions & { userEncryptedKey?: string; userIv?: string }
  ): Promise<ChatResult> {
    const provider = this.getProvider(options?.userEncryptedKey, options?.userIv);
    return provider.chat(messages, options);
  }
}

export const aiService = new AIService();
