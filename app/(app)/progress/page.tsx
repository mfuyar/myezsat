import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import TopicCard from "@/components/progress/TopicCard";
import XPChart from "@/components/progress/XPChart";
import Badge from "@/components/ui/Badge";
import { formatXP, pct } from "@/lib/utils";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [stats, topicProgress, streak, sessions] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId: user.id } }),
    prisma.topicProgress.findMany({ where: { userId: user.id }, orderBy: { lastPracticed: "desc" } }),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.studySession.findMany({
      where: { userId: user.id, completed: true },
      orderBy: { endedAt: "desc" },
      take: 30,
      select: { endedAt: true, xpEarned: true, subject: true },
    }),
  ]);

  const mathProgress = topicProgress.filter((t) => t.subject === "math");
  const elaProgress = topicProgress.filter((t) => t.subject === "ela");

  // Achievements
  const achievements = [
    { id: "first", label: "First Session", icon: "🎯", earned: (stats?.totalSessions ?? 0) >= 1 },
    { id: "ten", label: "10 Correct", icon: "✅", earned: (stats?.mathCorrect ?? 0) + (stats?.elaCorrect ?? 0) >= 10 },
    { id: "streak7", label: "7-Day Streak", icon: "🔥", earned: (streak?.longest ?? 0) >= 7 },
    { id: "xp100", label: "100 XP", icon: "⭐", earned: (stats?.totalXP ?? 0) >= 100 },
    { id: "xp500", label: "500 XP", icon: "💫", earned: (stats?.totalXP ?? 0) >= 500 },
    { id: "sessions10", label: "10 Sessions", icon: "📚", earned: (stats?.totalSessions ?? 0) >= 10 },
  ];

  const chartSessions = sessions.map((s) => ({
    endedAt: s.endedAt?.toISOString() ?? null,
    xpEarned: s.xpEarned,
    subject: s.subject,
  }));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          ← Dashboard
        </Link>
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <div className="w-20" />
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Your Progress</h1>
          <Badge variant="math" className="text-sm px-3 py-1">
            {formatXP(stats?.totalXP ?? 0)} Total XP
          </Badge>
        </div>

        {/* XP Chart */}
        <XPChart sessions={chartSessions} />

        {/* Math section */}
        {mathProgress.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">Math</h2>
              <span className="text-xs font-mono text-[var(--math)]">
                {pct(stats?.mathCorrect ?? 0, stats?.mathTotal ?? 0)}% accuracy
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mathProgress.map((p) => (
                <TopicCard key={p.id} progress={p as any} subject="math" />
              ))}
            </div>
          </section>
        )}

        {/* ELA section */}
        {elaProgress.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">English</h2>
              <span className="text-xs font-mono text-[var(--ela)]">
                {pct(stats?.elaCorrect ?? 0, stats?.elaTotal ?? 0)}% accuracy
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {elaProgress.map((p) => (
                <TopicCard key={p.id} progress={p as any} subject="ela" />
              ))}
            </div>
          </section>
        )}

        {topicProgress.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-[var(--muted)] text-sm">No sessions yet. Start studying to track your progress!</p>
            <Link href="/dashboard" className="inline-block mt-4 text-sm text-[var(--math)] hover:underline">
              Go to Dashboard →
            </Link>
          </div>
        )}

        {/* Achievements */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">
            Achievements
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`card p-4 flex items-center gap-3 transition-opacity ${
                  a.earned ? "" : "opacity-30"
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{a.label}</p>
                  <p className="text-xs text-[var(--muted)]">{a.earned ? "Earned" : "Locked"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-[var(--muted)] py-4 border-t border-[var(--border)]">
          Target: 750–800 Math · 700+ ELA — Ivy League competitive range
        </footer>
      </main>
    </div>
  );
}
