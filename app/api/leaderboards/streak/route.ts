import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

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
