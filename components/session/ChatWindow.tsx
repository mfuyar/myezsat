"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { ChatMessage, Subject } from "@/types";

interface ChatWindowProps {
  messages: ChatMessage[];
  subject: Subject;
  streaming: boolean;
}

export default function ChatWindow({ messages, subject, streaming }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    const isMath = subject === "math";
    const color = isMath ? "var(--math)" : "var(--ela)";
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-3"
            style={{ background: isMath ? "var(--math-bg)" : "var(--ela-bg)", color }}
          >
            {isMath ? "Σ" : "A"}
          </div>
          <p className="text-sm text-[var(--muted)]">
            Ask a question or use a quick action below to start.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          message={msg}
          subject={subject}
          streaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
