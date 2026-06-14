import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SessionCard from "@/components/dashboard/SessionCard";
import StatsRow from "@/components/dashboard/StatsRow";
import AccuracyBar from "@/components/dashboard/AccuracyBar";
import ScoreSection from "@/components/dashboard/ScoreSection";
import GameSection from "@/components/game/GameSection";
import Badge from "@/components/ui/Badge";
import { MATH_TOPICS, ELA_TOPICS } from "@/types";
import { formatDuration, pct } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [dbUser, stats, streak, recentSessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.userStats.findUnique({ where: { userId: user.id } }),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.studySession.findMany({
      where: { userId: user.id, completed: true },
      orderBy: { endedAt: "desc" },
      take: 5,
    }),
  ]);

  const dayParity = new Date().getDate() % 2 === 0;
  const hasAccuracy = (stats?.mathTotal ?? 0) > 0 || (stats?.elaTotal ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Top nav */}
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif italic text-xl text-[var(--text)] hover:opacity-80 transition-opacity">myezsat</Link>
        <div className="flex items-center gap-4">
          <Link href="/practice"    className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Practice</Link>
          <Link href="/mistakes"    className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Mistakes</Link>
          <Link href="/messages"    className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Messages</Link>
          <Link href="/leaderboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Leaderboard</Link>
          <Link href="/friends"     className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Friends</Link>
          <Link href="/badges"      className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Badges</Link>
          <Link href="/study-plan"  className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Study Plan</Link>
          <Link href="/progress"    className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Progress</Link>
          <Link href="/settings"    className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Settings</Link>
          {dbUser?.role === "admin" || dbUser?.role === "tutor" ? (
            <Link href="/admin" className="text-sm font-medium" style={{ color: "var(--math)" }}>Admin</Link>
          ) : null}
          <form action="/api/auth/signout" method="POST">
            <button className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Sign out</button>
          </form>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        <DashboardHeader name={dbUser?.name ?? null} streak={streak?.current ?? 0} />

        <GameSection />

        {/* Quick actions */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/practice",   label: "Practice",      icon: "📝", color: "var(--ela)",   desc: "Answer SAT-style questions" },
              { href: "/mistakes",   label: "Mistakes",      icon: "📖", color: "var(--math)",  desc: "Review wrong answers" },
              { href: "/study-plan", label: "Study Plan",    icon: "📅", color: "var(--ela)",   desc: "Your weekly schedule" },
              { href: "/study-tools",label: "Study Tools",   icon: "🃏", color: "var(--math)",  desc: "Flashcards & slideshows" },
              { href: "/settings",   label: "Vocab Emails",  icon: "✉️", color: "var(--ela)",   desc: "Daily SAT words" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                className="card p-4 flex flex-col gap-2 hover:bg-[var(--s2)] transition-colors">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{a.label}</p>
                  <p className="text-[11px] text-[var(--muted)]">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* AI Tutor sessions */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">
            AI Tutor Session
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SessionCard subject="math" topics={MATH_TOPICS} suggested={dayParity} />
            <SessionCard subject="ela" topics={ELA_TOPICS} suggested={!dayParity} />
          </div>
        </section>

        <StatsRow
          stats={stats}
          streak={streak ? { ...streak, lastStudied: streak.lastStudied?.toISOString() } : null}
        />

        <ScoreSection />

        {hasAccuracy && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(stats?.mathTotal ?? 0) > 0 && (
              <AccuracyBar subject="math" correct={stats!.mathCorrect} total={stats!.mathTotal} />
            )}
            {(stats?.elaTotal ?? 0) > 0 && (
              <AccuracyBar subject="ela" correct={stats!.elaCorrect} total={stats!.elaTotal} />
            )}
          </div>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">
              Recent Sessions
            </h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Subject", "Topic", "Duration", "XP", "Accuracy"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((s, i) => (
                    <tr
                      key={s.id}
                      className={i < recentSessions.length - 1 ? "border-b border-[var(--border)]" : ""}
                    >
                      <td className="px-4 py-3">
                        <Badge variant={s.subject as "math" | "ela"}>
                          {s.subject === "math" ? "Math" : "ELA"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--text)]">{s.topicLabel}</td>
                      <td className="px-4 py-3 font-mono text-[var(--muted)]">
                        {formatDuration(s.durationSec)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--math)]">+{s.xpEarned}</td>
                      <td className="px-4 py-3 font-mono text-[var(--muted)]">
                        {pct(s.correct, s.total)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-[var(--muted)] py-4 border-t border-[var(--border)]">
          Target: 750–800 Math · 700+ ELA — Ivy League competitive range
        </footer>
      </main>
    </div>
  );
}
