"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Badge {
  key: string; name: string; description: string; icon: string;
  category: string; condition: string; earned: boolean; earnedAt: string | null;
}

const CATEGORY_ORDER = ["milestone", "streak", "accuracy", "topic", "social"];
const CATEGORY_LABELS: Record<string, string> = {
  milestone: "Milestones", streak: "Streaks", accuracy: "Accuracy", topic: "Topics", social: "Social",
};

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedCount, setEarnedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  useEffect(() => {
    fetch("/api/badges").then((r) => r.json()).then((d) => {
      setBadges(d.badges ?? []);
      setEarnedCount(d.earnedCount ?? 0);
      setTotalCount(d.totalCount ?? 0);
      setLoading(false);
    });
  }, []);

  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
  const grouped = CATEGORY_ORDER.reduce<Record<string, Badge[]>>((acc, cat) => {
    const filtered = badges.filter((b) => b.category === cat && (filter === "all" || (filter === "earned" ? b.earned : !b.earned)));
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Dashboard</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Badges</h1>
            <p className="text-sm text-[var(--muted)] mt-1">{earnedCount} / {totalCount} earned</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono" style={{ color: "var(--math)" }}>{pct}%</p>
            <p className="text-xs text-[var(--muted)]">completion</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[var(--s3)] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--math)" }} />
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "earned", "locked"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize transition-all ${filter === f ? "bg-[var(--math)] border-transparent text-[var(--bg)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--math)] rounded-full animate-spin" />
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catBadges]) => (
            <section key={cat}>
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {catBadges.map((b) => (
                  <div key={b.key}
                    className={`card p-4 flex flex-col items-center gap-2 text-center transition-all ${b.earned ? "" : "opacity-40"}`}
                    style={b.earned ? { boxShadow: "0 0 12px rgba(201,148,61,0.15)" } : {}}>
                    <span className="text-3xl">{b.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text)]">{b.name}</p>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5 leading-relaxed">{b.description}</p>
                    </div>
                    {b.earned && b.earnedAt && (
                      <p className="text-[9px] text-green-400">
                        Earned {new Date(b.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                    {!b.earned && (
                      <p className="text-[9px] text-[var(--muted)] italic">{b.condition}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
