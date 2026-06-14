"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface ChallengeEntry {
  id: string;
  challenge: {
    id: string; title: string; subject: string; difficulty: string; status: string;
    questionCount: number; timeLimitMin: number; createdAt: string;
    participants: { userId: string; correct: number; total: number; score: number | null; rank: number | null; completedAt: string | null; user: { id: string; gameProfile: { username: string; level: number } | null } }[];
  };
  correct: number; total: number; score: number | null; rank: number | null; completedAt: string | null;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ targetUsername: "", subject: "ela", difficulty: "medium", questionCount: 10 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/challenges");
    const d = await res.json();
    setChallenges(d.challenges ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createChallenge() {
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/api/challenges", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(d.error ?? "Error"); return; }
    setShowCreate(false);
    load();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <div className="flex items-center gap-4">
          <Link href="/friends"   className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Friends</Link>
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Challenges</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Compete against friends on SAT-style practice questions</p>
          </div>
          <Button variant="math" size="sm" onClick={() => setShowCreate(true)}>+ Challenge Friend</Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text)]">New Challenge</p>
              <button onClick={() => setShowCreate(false)} className="text-[var(--muted)] hover:text-[var(--text)]">✕</button>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Friend's Username</label>
              <input type="text" value={form.targetUsername} onChange={(e) => setForm((f) => ({ ...f, targetUsername: e.target.value }))}
                placeholder="e.g. alex_4821"
                className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Section</label>
                <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
                  <option value="ela">Reading &amp; Writing</option>
                  <option value="math">Math</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Difficulty</label>
                <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                  className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-semibold block mb-1">Questions</label>
                <select value={form.questionCount} onChange={(e) => setForm((f) => ({ ...f, questionCount: parseInt(e.target.value) }))}
                  className="w-full bg-[var(--s2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="math" size="sm" loading={creating} onClick={createChallenge}>Send Challenge</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">⚔️</p>
            <p className="text-sm font-medium text-[var(--text)]">No challenges yet</p>
            <p className="text-xs text-[var(--muted)] mt-1">Challenge a friend to see who knows SAT better!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {challenges.map((entry) => {
              const c = entry.challenge;
              const me = c.participants.find((p) => p.completedAt && entry.rank !== null);
              const opponent = c.participants.find((p) => p.userId !== me?.userId);
              const status = c.status;
              return (
                <div key={c.id} className="card p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{c.title}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant={c.subject as "math" | "ela"}>{c.subject === "math" ? "Math" : "R&W"}</Badge>
                        <Badge variant="muted">{c.difficulty}</Badge>
                        <Badge variant="muted">{c.questionCount} questions</Badge>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${status === "completed" ? "bg-green-500/15 text-green-400" : status === "active" ? "bg-[var(--math-bg)] text-[var(--math)]" : "bg-[var(--s3)] text-[var(--muted)]"}`}>
                      {status}
                    </span>
                  </div>

                  {status === "completed" && (
                    <div className="flex gap-3">
                      {c.participants.map((p) => (
                        <div key={p.userId} className={`flex-1 card p-2 text-center ${p.rank === 1 ? "border-yellow-500/40" : ""}`}>
                          <p className="text-[10px] text-[var(--muted)]">@{p.user.gameProfile?.username ?? "?"}</p>
                          <p className="font-mono text-sm font-bold" style={{ color: p.rank === 1 ? "#f59e0b" : "var(--muted)" }}>
                            {p.rank === 1 ? "🥇" : "🥈"} {p.correct}/{p.total}
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">{Math.round((p.score ?? 0) * 100)}pts</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {status === "pending" && (
                    <Link href={`/practice?challengeId=${c.id}`}
                      className="text-sm text-center py-2 rounded-lg font-medium text-[var(--bg)] transition-all"
                      style={{ background: "var(--math)" }}>
                      Accept &amp; Start →
                    </Link>
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
