"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import ChatWindow from "@/components/session/ChatWindow";
import QuickActions from "@/components/session/QuickActions";
import ChatInput from "@/components/session/ChatInput";
import Badge from "@/components/ui/Badge";
import type { ChatMessage, Subject, Difficulty, Topic } from "@/types";
import { MATH_TOPICS, ELA_TOPICS } from "@/types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function DemoSession() {
  const [subject, setSubject] = useState<Subject>("math");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);

  const topics = subject === "math" ? MATH_TOPICS : ELA_TOPICS;
  const color = subject === "math" ? "var(--math)" : "var(--ela)";

  const send = useCallback(
    async (userContent: string) => {
      if (!topic) return;
      const userMsg: ChatMessage = { role: "user", content: userContent };
      const assistantMsg: ChatMessage = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      try {
        const res = await fetch("/api/demo-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
            subject,
            topicLabel: topic.label,
            difficulty,
          }),
        });

        if (!res.ok || !res.body) throw new Error("Stream failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            try {
              const chunk = JSON.parse(payload) as { text?: string; error?: string };
              if (chunk.error) throw new Error(chunk.error);
              if (chunk.text) {
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: (next[next.length - 1].content ?? "") + chunk.text };
                  return next;
                });
              }
            } catch { /* ignore */ }
          }
        }
      } catch {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: "Something went wrong. Try again." };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [messages, subject, topic, difficulty]
  );

  if (!started) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col">
        {/* Demo banner */}
        <div className="bg-[var(--math-bg)] border-b border-[var(--math)]/30 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-[var(--math)] font-medium">
            Demo mode — no account needed · progress not saved
          </p>
          <Link href="/signup" className="text-xs font-semibold text-[var(--math)] hover:underline">
            Sign up free →
          </Link>
        </div>

        <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Sign in</Link>
            <Link href="/signup" className="text-sm font-medium text-[var(--text)] bg-[var(--s3)] border border-[var(--border)] px-3 py-1 rounded-lg hover:border-[var(--muted)] transition-colors">Sign up</Link>
          </div>
        </nav>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg flex flex-col gap-7">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[var(--text)]">Try a free session</h1>
              <p className="text-sm text-[var(--muted)] mt-1">Real AI tutor, no account required</p>
            </div>

            {/* Subject toggle */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
              {(["math", "ela"] as Subject[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSubject(s); setTopic(null); }}
                  className="flex-1 py-3 text-sm font-medium transition-all"
                  style={subject === s
                    ? { background: s === "math" ? "var(--math-bg)" : "var(--ela-bg)", color: s === "math" ? "var(--math)" : "var(--ela)" }
                    : { background: "var(--s1)", color: "var(--muted)" }
                  }
                >
                  {s === "math" ? "Math" : "English"}
                </button>
              ))}
            </div>

            {/* Difficulty */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium">Difficulty</p>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="flex-1 py-2 rounded-full text-sm font-medium border transition-all"
                    style={difficulty === d
                      ? { background: color, borderColor: color, color: "var(--bg)" }
                      : { borderColor: "var(--border)", color: "var(--muted)" }
                    }
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic picker */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium">Topic</p>
              <div className="grid grid-cols-1 gap-2">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTopic(t)}
                    className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                    style={topic?.id === t.id
                      ? { borderColor: color, background: subject === "math" ? "var(--math-bg)" : "var(--ela-bg)" }
                      : { borderColor: "var(--border)", background: "var(--s1)" }
                    }
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-sm font-medium text-[var(--text)]">{t.label}</span>
                    {topic?.id === t.id && <span className="ml-auto text-sm" style={{ color }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!topic}
              onClick={() => setStarted(true)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: color, color: "var(--bg)" }}
            >
              Start Demo Session →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">
      {/* Demo banner */}
      <div className="bg-[var(--math-bg)] border-b border-[var(--math)]/30 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-[var(--math)] font-medium">
          Demo mode — progress not saved
        </p>
        <Link href="/signup" className="text-xs font-semibold text-[var(--math)] hover:underline">
          Sign up free to track progress →
        </Link>
      </div>

      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
        <button onClick={() => { setStarted(false); setMessages([]); }} className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mr-1">←</button>
        <Badge variant={subject}>{subject === "math" ? "Math" : "ELA"}</Badge>
        <span className="text-sm text-[var(--muted)] truncate">{topic?.label}</span>
        <Badge variant="muted">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</Badge>
        <Link href="/signup" className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--muted)] transition-colors">
          Sign up free
        </Link>
      </header>

      <ChatWindow messages={messages} subject={subject} streaming={streaming} />

      <div className="border-t border-[var(--border)]">
        <QuickActions subject={subject} disabled={streaming} onAction={send} />
        <ChatInput subject={subject} disabled={streaming} onSend={send} />
      </div>
    </div>
  );
}
