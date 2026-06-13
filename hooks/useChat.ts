"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, Subject } from "@/types";

interface UseChatOptions {
  sessionId: string;
  subject: Subject;
  topicLabel: string;
  difficulty: string;
  onScoreUpdate?: (isCorrect: boolean, xp: number) => void;
}

const CORRECT_RE = /✓\s*ANSWER/i;
const WRONG_RE = /\bwrong\b|\bincorrect\b|\bnot quite\b|\bclose\b/i;
const XP_BY_DIFF: Record<string, number> = { easy: 10, medium: 20, hard: 35 };

export function useChat({ sessionId, subject, topicLabel, difficulty, onScoreUpdate }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const send = useCallback(
    async (userContent: string) => {
      const userMsg: ChatMessage = { role: "user", content: userContent };
      const assistantMsg: ChatMessage = { role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
            subject,
            topicLabel,
            difficulty,
          }),
        });

        if (!res.ok || !res.body) throw new Error("Stream failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value, { stream: true }).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const chunk = JSON.parse(payload) as { text?: string; error?: string };
              if (chunk.error) throw new Error(chunk.error);
              if (chunk.text) {
                full += chunk.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: full };
                  return next;
                });
              }
            } catch {
              // ignore malformed SSE
            }
          }
        }

        // Score detection
        if (onScoreUpdate) {
          if (CORRECT_RE.test(full)) {
            onScoreUpdate(true, XP_BY_DIFF[difficulty] ?? 20);
          } else if (WRONG_RE.test(full)) {
            onScoreUpdate(false, 0);
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [messages, sessionId, subject, topicLabel, difficulty, onScoreUpdate]
  );

  return { messages, streaming, send, setMessages };
}
