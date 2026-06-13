import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getLevelInfo } from "@/lib/game/levels";
import Link from "next/link";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const gameProfile = await prisma.gameProfile.findUnique({
    where: { username },
    include: { user: { select: { id: true, name: true, createdAt: true } } },
  });
  if (!gameProfile) notFound();

  const isOwn = user?.id === gameProfile.userId;
  const privacy = gameProfile.privacySetting;

  // Check if viewer is a friend
  let isFriend = false;
  if (!isOwn && user) {
    const conn = await prisma.friendConnection.findFirst({
      where: { OR: [{ requesterId: user.id, receiverId: gameProfile.userId }, { requesterId: gameProfile.userId, receiverId: user.id }], status: "accepted" },
    });
    isFriend = !!conn;
  }

  const canSeeStats = isOwn || privacy === "public" || (privacy === "friends" && isFriend);

  const [streak, earnedBadges] = await Promise.all([
    canSeeStats ? prisma.streak.findUnique({ where: { userId: gameProfile.userId } }) : null,
    prisma.earnedBadge.findMany({ where: { userId: gameProfile.userId }, include: { badge: true }, orderBy: { earnedAt: "desc" }, take: 12 }),
  ]);

  const levelInfo = getLevelInfo(gameProfile.totalXP);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">← Dashboard</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Profile header */}
        <div className="card p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-[var(--bg)] flex-shrink-0"
            style={{ background: "var(--math)" }}>
            {levelInfo.level}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text)]">@{gameProfile.username}</h1>
            <p className="text-sm text-[var(--muted)]">Level {levelInfo.level} · {levelInfo.name}</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Joined {gameProfile.user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          {!isOwn && user && (
            <Link href="/friends" className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors flex-shrink-0">
              {isFriend ? "Friends ✓" : "+ Add Friend"}
            </Link>
          )}
          {isOwn && (
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors flex-shrink-0">
              Edit Profile
            </Link>
          )}
        </div>

        {/* Stats (privacy-gated) */}
        {canSeeStats ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Total XP</p>
              <p className="font-mono font-bold text-lg" style={{ color: "var(--math)" }}>{gameProfile.totalXP}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Streak</p>
              <p className="font-mono font-bold text-lg" style={{ color: "#f59e0b" }}>🔥 {streak?.current ?? 0}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Best Streak</p>
              <p className="font-mono font-bold text-lg text-[var(--text)]">{streak?.longest ?? 0}</p>
            </div>
          </div>
        ) : (
          <div className="card p-4 text-center">
            <p className="text-sm text-[var(--muted)]">
              {privacy === "private" ? "This profile is private." : "Connect as friends to see stats."}
            </p>
          </div>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold mb-3">
              Badges ({earnedBadges.length})
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {earnedBadges.map((b) => (
                <div key={b.badgeKey} title={b.badge.name}
                  className="w-full aspect-square rounded-xl bg-[var(--s2)] border border-[var(--border)] flex items-center justify-center text-2xl cursor-default"
                  style={{ boxShadow: "0 0 8px rgba(201,148,61,0.12)" }}>
                  {b.badge.icon}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
