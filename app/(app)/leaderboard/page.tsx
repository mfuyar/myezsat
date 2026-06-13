"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Tab = "weekly" | "friends" | "streak";

interface Entry {
  userId: string; username: string; level: number;
  weeklyXP?: number; totalXP?: number; streak?: number; longest?: number;
  rank: number; isMe: boolean;
}

const LEVEL_NAMES = ["","Beginner","SAT Explorer","Problem Solver","Algebra Warrior","Grammar Master","Test Strategist","SAT Champion"];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("weekly");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leaderboards/${tab}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setMyRank(data.myRank ?? null);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const TABS: { key: Tab; label: string; desc: string }[] = [
    { key: "weekly",  label: "Weekly XP",    desc: "Public · Top by XP this week" },
    { key: "friends", label: "Friends",       desc: "Friends only · Weekly XP" },
    { key: "streak",  label: "Best Streak",   desc: "Friends only · Current streak" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Dashboard</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Leaderboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Compete with friends and students worldwide</p>
        </div>

        {myRank && tab === "weekly" && (
          <div className="card p-4 flex items-center gap-3 border-l-4" style={{ borderLeftColor: "var(--math)" }}>
            <span className="text-2xl font-bold font-mono" style={{ color: "var(--math)" }}>#{myRank}</span>
            <p className="text-sm text-[var(--text)]">Your weekly rank — keep practicing to move up!</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${tab === t.key ? "bg-[var(--math)] border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] -mt-4">{TABS.find((t) => t.key === tab)?.desc}</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-2xl mb-2">🤝</p>
            <p className="text-sm text-[var(--text)]">No data yet. {tab !== "weekly" ? "Connect with friends to see their ranking!" : "Start practicing to earn XP!"}</p>
            {tab !== "weekly" && <Link href="/friends" className="text-sm text-[var(--ela)] mt-2 inline-block">Find friends →</Link>}
          </div>
        ) : (
          <div className="card overflow-hidden">
            {entries.map((e, i) => {
              const isTop3 = e.rank <= 3;
              const medals = ["🥇","🥈","🥉"];
              return (
                <div key={e.userId}
                  className={`flex items-center gap-4 px-4 py-3 ${i < entries.length - 1 ? "border-b border-[var(--border)]" : ""} ${e.isMe ? "bg-[var(--math-bg)]" : ""}`}>
                  <span className="w-8 text-center font-mono text-sm font-bold flex-shrink-0"
                    style={{ color: isTop3 ? "var(--math)" : "var(--muted)" }}>
                    {isTop3 ? medals[e.rank - 1] : `#${e.rank}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${e.isMe ? "text-[var(--math)]" : "text-[var(--text)]"}`}>
                      @{e.username} {e.isMe && <span className="text-[10px] text-[var(--muted)]">(you)</span>}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">Level {e.level} · {LEVEL_NAMES[e.level] ?? ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {tab === "streak" ? (
                      <p className="font-mono text-sm font-bold" style={{ color: "#f59e0b" }}>🔥 {e.streak}</p>
                    ) : (
                      <p className="font-mono text-sm font-bold" style={{ color: "var(--math)" }}>{e.weeklyXP} XP</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
