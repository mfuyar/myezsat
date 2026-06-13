"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";

interface MistakeAttempt {
  id: string;
  selectedAnswer: string | null;
  masteredAt: string | null;
  attemptedAt: string;
  satQuestion: {
    id: string;
    subject: string;
    topicId: string;
    difficulty: string;
    question: string;
    passage: string | null;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string | null;
    correctAnswer: string;
    explanation: string;
    hasImage: boolean;
  };
}

const CHOICE_LABELS: Record<string, string> = { A: "choiceA", B: "choiceB", C: "choiceC", D: "choiceD" };

function choiceText(q: MistakeAttempt["satQuestion"], k: string): string {
  return (q as unknown as Record<string, string>)[CHOICE_LABELS[k]] ?? "";
}

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<MistakeAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unmastered" | "mastered">("unmastered");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const qs = filter === "mastered" ? "?mastered=true" : filter === "unmastered" ? "?mastered=false" : "";
    const res = await fetch(`/api/mistakes${qs}`);
    const data = await res.json();
    setMistakes(data.mistakes ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function toggleMastered(attemptId: string) {
    await fetch("/api/mistakes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    });
    fetch_();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Dashboard</Link>
          <Link href="/practice"  className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Practice</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Mistake Notebook</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Review questions you got wrong and mark them as mastered</p>
          </div>
          <Link href="/practice"
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--bg)] transition-all"
            style={{ background: "var(--ela)" }}>
            Practice Again
          </Link>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["unmastered", "mastered", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${filter === f ? "bg-[var(--ela)] border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}>
              {f === "unmastered" ? "To Review" : f === "mastered" ? "Mastered" : "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--ela)] rounded-full animate-spin" />
          </div>
        ) : mistakes.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-medium text-[var(--text)]">
              {filter === "unmastered" ? "No mistakes to review — great work!" : "No mistakes found"}
            </p>
            <Link href="/practice" className="text-sm text-[var(--ela)] mt-2 inline-block hover:opacity-80">Start a practice session →</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mistakes.map((m) => {
              const q = m.satQuestion;
              const isExpanded = expanded === m.id;
              const isMastered = !!m.masteredAt;
              return (
                <div key={m.id} className={`card overflow-hidden transition-all ${isMastered ? "opacity-60" : ""}`}>
                  {/* Header */}
                  <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--s2)] transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : m.id)}>
                    <span className="text-red-400 text-lg flex-shrink-0">{isMastered ? "✓" : "✗"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={q.subject as "math" | "ela"}>{q.subject === "math" ? "Math" : "R&W"}</Badge>
                        <Badge variant="muted">{q.topicId.replace(/-/g, " ")}</Badge>
                        <Badge variant="muted">{q.difficulty}</Badge>
                        {isMastered && <span className="text-xs text-green-400 font-medium">Mastered</span>}
                      </div>
                      <p className="text-sm text-[var(--text)] line-clamp-2">{q.question}</p>
                    </div>
                    <span className="text-[var(--muted)] text-sm flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] p-4 flex flex-col gap-4">
                      {q.passage && (
                        <div className="text-xs text-[var(--muted)] leading-relaxed bg-[var(--s2)] rounded-lg p-3 max-h-40 overflow-y-auto">
                          {q.passage}
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {(["A","B","C","D"] as const).filter((k) => choiceText(q, k)).map((k) => {
                          const isCorrect = k === q.correctAnswer;
                          const wasSelected = k === m.selectedAnswer;
                          return (
                            <div key={k} className={`flex gap-2 items-start p-3 rounded-lg text-sm border ${isCorrect ? "border-green-500/40 bg-green-500/8" : wasSelected ? "border-red-500/40 bg-red-500/8" : "border-[var(--border)]"}`}>
                              <span className={`font-mono font-bold w-4 flex-shrink-0 ${isCorrect ? "text-green-400" : wasSelected ? "text-red-400" : "text-[var(--muted)]"}`}>{k}</span>
                              <span className={isCorrect ? "text-green-300" : wasSelected ? "text-red-300" : "text-[var(--muted)]"}>{choiceText(q, k)}</span>
                              {isCorrect && <span className="ml-auto text-green-400 text-xs flex-shrink-0">✓ Correct</span>}
                              {wasSelected && !isCorrect && <span className="ml-auto text-red-400 text-xs flex-shrink-0">Your answer</span>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-[var(--s2)] rounded-lg p-3">
                        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-1">Explanation</p>
                        <p className="text-sm text-[var(--text)] leading-relaxed">{q.explanation}</p>
                      </div>

                      <button onClick={() => toggleMastered(m.id)}
                        className={`self-start px-4 py-2 rounded-lg text-sm font-medium border transition-all ${isMastered ? "border-[var(--border)] text-[var(--muted)]" : "border-green-500/40 text-green-400 hover:bg-green-500/10"}`}>
                        {isMastered ? "↩ Unmark mastered" : "✓ Mark as mastered"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
