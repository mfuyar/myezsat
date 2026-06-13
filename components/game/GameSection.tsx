"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface LevelInfo { level: number; name: string; nextMin: number | null; currentMin: number; progressPct: number }
interface GameProfile { totalXP: number; weeklyXP: number; level: number; username: string; coins: number }
interface Streak { current: number; longest: number }
interface Quest { id: string; status: string; progress: number; quest: { title: string; targetValue: number; rewardXP: number } }
interface Badge { key: string; name: string; icon: string; earnedAt: string }

export default function GameSection() {
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [recentBadges, setRecentBadges] = useState<Badge[]>([]);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [gameRes, questRes, lbRes] = await Promise.all([
      fetch("/api/game/profile"),
      fetch("/api/quests/daily"),
      fetch("/api/leaderboards/weekly"),
    ]);
    if (gameRes.ok) {
      const d = await gameRes.json();
      setProfile(d.profile);
      setLevelInfo(d.levelInfo);
      setStreak(d.streak);
      setRecentBadges(d.recentBadges?.map((b: { badge: Badge }) => ({ ...b.badge })) ?? []);
    }
    if (questRes.ok) {
      const d = await questRes.json();
      setQuests(d.quests ?? []);
    }
    if (lbRes.ok) {
      const d = await lbRes.json();
      setWeeklyRank(d.myRank);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function claimQuest(questId: string) {
    const res = await fetch("/api/quests/claim", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId }),
    });
    if (res.ok) load();
  }

  if (loading) return (
    <section className="card p-4 animate-pulse">
      <div className="h-4 bg-[var(--s3)] rounded w-1/3 mb-3" />
      <div className="h-2 bg-[var(--s3)] rounded w-full mb-2" />
      <div className="h-2 bg-[var(--s3)] rounded w-2/3" />
    </section>
  );

  if (!profile || !levelInfo) return null;

  const completedQuests = quests.filter((q) => q.status === "completed" || q.status === "claimed").length;

  return (
    <section className="card overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--s2)] transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-[var(--bg)]"
            style={{ background: "var(--math)" }}>
            {levelInfo.level}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{levelInfo.name}</p>
            <p className="text-[11px] text-[var(--muted)]">
              {profile.totalXP} XP{levelInfo.nextMin ? ` · ${levelInfo.nextMin - profile.totalXP} to Level ${levelInfo.level + 1}` : " · Max Level"}
            </p>
          </div>
          {streak && streak.current > 0 && (
            <span className="flex items-center gap-1 text-sm font-semibold ml-2" style={{ color: "#f59e0b" }}>
              🔥 {streak.current}
            </span>
          )}
        </div>
        <span className="text-[var(--muted)] text-sm">{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-[var(--border)]">
          {/* XP bar */}
          <div className="pt-4">
            <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
              <span>{levelInfo.currentMin} XP</span>
              {levelInfo.nextMin && <span>{levelInfo.nextMin} XP</span>}
            </div>
            <div className="h-2 rounded-full bg-[var(--s3)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${levelInfo.progressPct}%`, background: "var(--math)" }} />
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1 text-right">{levelInfo.progressPct}% progress</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Weekly XP</p>
              <p className="font-mono font-semibold text-[var(--math)]">{profile.weeklyXP}</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Weekly Rank</p>
              <p className="font-mono font-semibold text-[var(--text)]">{weeklyRank ? `#${weeklyRank}` : "—"}</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Streak</p>
              <p className="font-mono font-semibold" style={{ color: "#f59e0b" }}>🔥 {streak?.current ?? 0}</p>
            </div>
          </div>

          {/* Daily quests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
                Daily Quests ({completedQuests}/{quests.length})
              </p>
              <Link href="/badges" className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">Badges →</Link>
            </div>
            <div className="flex flex-col gap-1.5">
              {quests.map((q) => {
                const pct = Math.min(100, Math.round((q.progress / q.quest.targetValue) * 100));
                const done = q.status === "completed" || q.status === "claimed";
                return (
                  <div key={q.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${done ? "bg-green-500/8" : "bg-[var(--s2)]"}`}>
                    <span className="text-sm">{done ? "✓" : "○"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text)] truncate">{q.quest.title}</p>
                      <div className="h-1 rounded-full bg-[var(--s3)] mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? "#22c55e" : "var(--ela)" }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--muted)] flex-shrink-0">{q.progress}/{q.quest.targetValue}</span>
                    {q.status === "completed" && (
                      <button onClick={() => claimQuest(q.id)}
                        className="text-[10px] px-2 py-1 rounded-md font-semibold text-[var(--bg)] flex-shrink-0"
                        style={{ background: "var(--math)" }}>
                        +{q.quest.rewardXP} XP
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Recent Badges</p>
                <Link href="/badges" className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors">View all →</Link>
              </div>
              <div className="flex gap-2">
                {recentBadges.slice(0, 5).map((b) => (
                  <div key={b.key} title={b.name}
                    className="w-10 h-10 rounded-xl bg-[var(--s2)] border border-[var(--border)] flex items-center justify-center text-xl cursor-default"
                    style={{ boxShadow: "0 0 8px rgba(201,148,61,0.15)" }}>
                    {b.icon}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="flex gap-2 pt-1">
            <Link href="/leaderboard" className="flex-1 text-center py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--s2)] transition-colors">
              Leaderboard
            </Link>
            <Link href="/friends" className="flex-1 text-center py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--s2)] transition-colors">
              Friends
            </Link>
            <Link href="/challenges" className="flex-1 text-center py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--s2)] transition-colors">
              Challenges
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
