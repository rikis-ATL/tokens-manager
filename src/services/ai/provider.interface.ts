export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ToolExecutor = (
  toolName: string,
  toolInput: Record<string, unknown>
) => Promise<{ success: boolean; message: string; data?: unknown }>;

export interface ChatOptions {
  systemPrompt?: string;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolExecutor?: ToolExecutor;
}

export interface ChatResult {
  reply: string;
  toolsExecuted: boolean;
}

export interface AIProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResult>;
}
