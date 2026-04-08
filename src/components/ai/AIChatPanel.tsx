"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message } from "@/services/ai/provider.interface";

interface AIChatPanelProps {
  collectionId: string;
  collectionName: string;
  activeThemeId?: string | null;
  onToolsExecuted?: () => void;
}

export function AIChatPanel({ collectionId, collectionName, activeThemeId, onToolsExecuted }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const newMessages: Message[] = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          collectionId,
          themeId: activeThemeId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? `Request failed (${response.status})`;
        if (response.status === 402) {
          setError("API key not configured. Please add your Anthropic API key in Settings.");
        } else {
          setError(msg);
        }
        return;
      }

      const data = await response.json() as { reply: string; toolsExecuted: boolean };
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.toolsExecuted) {
        onToolsExecuted?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Ask about tokens, create themes, rename in bulk, or paste values for naming suggestions.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg px-3 py-2 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-200">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about tokens, create themes, or paste values for naming..."
          disabled={isLoading}
          className="flex-1 text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          size="sm"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
