export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  maxTokens?: number;
}

export interface AIProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
}
