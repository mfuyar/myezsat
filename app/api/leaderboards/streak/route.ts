import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.friendConnection.findMany({
    where: { OR: [{ requesterId: user.id }, { receiverId: user.id }], status: "accepted" },
    select: { requesterId: true, receiverId: true },
  });
  const friendIds = connections.map((c) => c.requesterId === user.id ? c.receiverId : c.requesterId);
  const allIds = [user.id, ...friendIds];

  const streaks = await prisma.streak.findMany({
    where: { userId: { in: allIds } },
    orderBy: { current: "desc" },
    include: { user: { select: { id: true, gameProfile: { select: { username: true, level: true } } } } },
  });

  const entries = streaks.map((s, i) => ({
    rank: i + 1,
    userId: s.userId,
    username: s.user.gameProfile?.username ?? s.userId,
    level: s.user.gameProfile?.level ?? 1,
    streak: s.current,
    longest: s.longest,
    isMe: s.userId === user.id,
  }));

  return NextResponse.json({ entries });
}
