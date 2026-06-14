"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MATH_TOPICS, ELA_TOPICS } from "@/types";
import type { Subject, Difficulty } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ShareStudyDiscussion from "@/components/messages/ShareStudyDiscussion";

type DifficultyOption = Difficulty | "mixed";

const DIFFICULTIES: { value: DifficultyOption; label: string; desc: string }[] = [
  { value: "mixed",  label: "Mixed",  desc: "All levels" },
  { value: "easy",   label: "Easy",   desc: "Foundational" },
  { value: "medium", label: "Medium", desc: "Standard SAT" },
  { value: "hard",   label: "Hard",   desc: "Advanced" },
];

const COUNTS = [5, 10, 20, 30];

export default function PracticeSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") === "math" ? "math" : "ela";
  const initialTopic = searchParams.get("topic") ?? "all";
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [topicId, setTopicId] = useState<string>(initialTopic);
  const [difficulty, setDifficulty] = useState<DifficultyOption>("mixed");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topics = subject === "math" ? MATH_TOPICS : ELA_TOPICS;
  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const color = subject === "math" ? "var(--math)" : "var(--ela)";

  async function startPractice() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        topicId: topicId === "all" ? undefined : topicId,
        difficulty: difficulty === "mixed" ? undefined : difficulty,
        count,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to start"); return; }
    router.push(`/practice/${data.sessionId}?q=${data.questionIds.join(",")}`);
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
          <p className="text-sm text-[var(--muted)] mt-1">Answer original SAT-style practice questions</p>
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

        {selectedTopic && (
          <div className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Study {selectedTopic.label} with friends</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Start a 1:1 or group discussion before practice.
              </p>
            </div>
            <ShareStudyDiscussion
              payload={{
                kind: "topic",
                subject,
                topicId: selectedTopic.id,
                topicLabel: selectedTopic.label,
              }}
              buttonLabel="Discuss topic"
              buttonVariant={subject === "math" ? "math" : "ela"}
            />
          </div>
        )}

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
