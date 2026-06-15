"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MATH_TOPICS, ELA_TOPICS } from "@/types";
import type { Subject, Difficulty } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type DifficultyOption = Difficulty | "mixed";

const DIFFICULTIES: { value: DifficultyOption; label: string; desc: string }[] = [
  { value: "mixed",  label: "Mixed",  desc: "All levels" },
  { value: "easy",   label: "Easy",   desc: "Foundational" },
  { value: "medium", label: "Medium", desc: "Standard SAT" },
  { value: "hard",   label: "Hard",   desc: "Advanced" },
];

const COUNTS = [5, 10, 20, 30];
const START_TIMEOUT_MS = 15000;

export default function PracticeSetupPage() {
  const router = useRouter();
  const [subject, setSubject] = useState<Subject>("ela");
  const [topicId, setTopicId] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<DifficultyOption>("mixed");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topics = subject === "math" ? MATH_TOPICS : ELA_TOPICS;
  const color = subject === "math" ? "var(--math)" : "var(--ela)";

  async function startPractice() {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), START_TIMEOUT_MS);

    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          subject,
          topicId: topicId === "all" ? undefined : topicId,
          difficulty: difficulty === "mixed" ? undefined : difficulty,
          count,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to start practice.");
        return;
      }
      if (!data.sessionId || !Array.isArray(data.questionIds) || data.questionIds.length === 0) {
        setError("Practice started without questions. Try a different topic or difficulty.");
        return;
      }
      router.push(`/practice/${data.sessionId}?q=${data.questionIds.join(",")}`);
    } catch (err) {
      setError(err instanceof DOMException && err.name === "AbortError"
        ? "Practice took too long to start. Try again or choose fewer questions."
        : "Practice could not start. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Dashboard</Link>
          <Link href="/mistakes"  className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Mistake Notebook</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Practice</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Answer real SAT questions from the official question bank</p>
        </div>

        {/* Subject */}
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-2">Section</p>
          <div className="flex gap-2">
            {(["ela", "math"] as Subject[]).map((s) => (
              <button key={s} onClick={() => { setSubject(s); setTopicId("all"); }}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${subject === s ? "border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}
                style={subject === s ? { background: s === "math" ? "var(--math)" : "var(--ela)" } : {}}>
                {s === "math" ? "Math" : "Reading & Writing"}
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-2">Topic</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Card hover onClick={() => setTopicId("all")}
              className={`p-3 cursor-pointer text-sm font-medium transition-all ${topicId === "all" ? "border-opacity-100" : ""}`}
              style={topicId === "all" ? { borderColor: color } : {}}>
              All Topics
            </Card>
            {topics.map((t) => (
              <Card key={t.id} hover onClick={() => setTopicId(t.id)}
                className={`p-3 cursor-pointer transition-all`}
                style={topicId === t.id ? { borderColor: color } : {}}>
                <span className="text-lg mr-1">{t.icon}</span>
                <span className="text-sm font-medium text-[var(--text)]">{t.label}</span>
              </Card>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-2">Difficulty</p>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTIES.map((d) => (
              <button key={d.value} onClick={() => setDifficulty(d.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${difficulty === d.value ? "border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}
                style={difficulty === d.value ? { background: color } : {}}>
                {d.label} <span className="text-[10px] opacity-70">· {d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold mb-2">Questions</p>
          <div className="flex gap-2">
            {COUNTS.map((n) => (
              <button key={n} onClick={() => setCount(n)}
                className={`w-14 h-10 rounded-lg text-sm font-mono font-semibold transition-all border ${count === n ? "border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}
                style={count === n ? { background: color } : {}}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button variant={subject === "math" ? "math" : "ela"} size="lg" onClick={startPractice} loading={loading} className="self-start">
          Start {count} Questions →
        </Button>
      </main>
    </div>
  );
}
