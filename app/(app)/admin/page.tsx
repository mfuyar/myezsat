import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminQuestions from "@/components/admin/AdminQuestions";
import AdminUsers from "@/components/admin/AdminUsers";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, name: true } });
  if (dbUser?.role !== "admin" && dbUser?.role !== "tutor") redirect("/dashboard");

  const [totalQ, totalUsers, completedSessions] = await Promise.all([
    prisma.sATQuestion.count(),
    prisma.user.count(),
    prisma.practiceSession.count({ where: { completed: true } }),
  ]);

  const topicStats = await prisma.sATQuestion.groupBy({
    by: ["topicId", "difficulty"],
    _count: { id: true },
    orderBy: { topicId: "asc" },
  });

  const byTopic: Record<string, Record<string, number>> = {};
  for (const row of topicStats) {
    if (!byTopic[row.topicId]) byTopic[row.topicId] = {};
    byTopic[row.topicId][row.difficulty] = row._count.id;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat <span className="text-xs text-[var(--muted)] not-italic font-normal ml-1">admin</span></span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage questions and monitor usage</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Questions in Bank", value: totalQ.toLocaleString(), color: "var(--math)" },
            { label: "Registered Users", value: totalUsers.toLocaleString(), color: "var(--ela)" },
            { label: "Practice Sessions", value: completedSessions.toLocaleString(), color: "var(--green)" },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex flex-col gap-1">
              <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold">{s.label}</p>
              <p className="text-3xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Question bank breakdown */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">Question Bank by Topic</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Topic", "Easy", "Medium", "Hard", "Total"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byTopic).map(([topic, counts], i) => {
                  const total = Object.values(counts).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={topic} className={i < Object.keys(byTopic).length - 1 ? "border-b border-[var(--border)]" : ""}>
                      <td className="px-4 py-3 font-medium text-[var(--text)] capitalize">{topic.replace(/-/g, " ")}</td>
                      <td className="px-4 py-3 font-mono text-green-400">{counts.easy ?? 0}</td>
                      <td className="px-4 py-3 font-mono text-yellow-400">{counts.medium ?? 0}</td>
                      <td className="px-4 py-3 font-mono text-red-400">{counts.hard ?? 0}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[var(--text)]">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* User management */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">User Management</h2>
          <AdminUsers />
        </section>

        {/* Question management */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">Question Management</h2>
          <AdminQuestions />
        </section>
      </main>
    </div>
  );
}
