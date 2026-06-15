import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SessionCard from "@/components/dashboard/SessionCard";
import StatsRow from "@/components/dashboard/StatsRow";
import ScoreSection from "@/components/dashboard/ScoreSection";
import RecentSessions from "@/components/dashboard/RecentSessions";
import GameSection from "@/components/game/GameSection";
import { MATH_TOPICS, ELA_TOPICS } from "@/types";

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
      where: {
        userId: user.id,
        completed: true,
      },
      orderBy: { endedAt: "desc" },
      take: 5,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const dayParity = new Date().getDate() % 2 === 0;
  const isStaff = dbUser?.role === "admin" || dbUser?.role === "tutor";
  const recentSessionItems = recentSessions.map((session) => ({
    id: session.id,
    subject: session.subject,
    topicLabel: session.topicLabel,
    durationSec: session.durationSec,
    xpEarned: session.xpEarned,
    correct: session.correct,
    total: session.total,
    endedAt: session.endedAt?.toISOString() ?? null,
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  }));

  const studyNav = [
    { href: "/practice", label: "Practice", icon: "P" },
    { href: "/mistakes", label: "Mistakes", icon: "M" },
    { href: "/study-plan", label: "Study Plan", icon: "S" },
    { href: "/study-tools", label: "Tools", icon: "T" },
  ];
  const progressNav = [
    { href: "/progress", label: "Progress" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/badges", label: "Badges" },
  ];
  const communityNav = [
    { href: "/messages", label: "Messages" },
    { href: "/friends", label: "Friends" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Top nav */}
      <nav className="border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="font-serif italic text-2xl text-[var(--text)] hover:opacity-80 transition-opacity">
              myezsat
            </Link>
            <Link
              href="/practice"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 lg:hidden"
              style={{ background: "var(--ela)" }}
            >
              Start Practice
            </Link>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--s1)] p-1.5">
              {studyNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--s2)]"
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-[var(--bg)]"
                    style={{ background: item.href === "/practice" ? "var(--ela)" : "var(--math)" }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--s1)] p-1.5">
              {progressNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--text)]"
                >
                  {item.label}
                </Link>
              ))}
              <span className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" />
              {communityNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--text)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--s1)] p-1.5">
              <Link
                href="/settings"
                className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--text)]"
              >
                Settings
              </Link>
              {isStaff ? (
                <Link
                  href="/admin"
                  className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-[var(--math-bg)]"
                  style={{ color: "var(--math)" }}
                >
                  Admin
                </Link>
              ) : null}
              <form action="/api/auth/signout" method="POST">
                <button className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--text)]">
                  Sign out
                </button>
              </form>
            </div>
          </div>
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

        <RecentSessions sessions={recentSessionItems} />

        <footer className="text-center text-xs text-[var(--muted)] py-4 border-t border-[var(--border)]">
          Target: 750–800 Math · 700+ ELA — Ivy League competitive range
        </footer>
      </main>
    </div>
  );
}
