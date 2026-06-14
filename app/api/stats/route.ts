import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const [stats, topicProgress, streak, recentSessions] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId: user.id } }),
    prisma.topicProgress.findMany({ where: { userId: user.id }, orderBy: { lastPracticed: "desc" } }),
    prisma.streak.findUnique({ where: { userId: user.id } }),
    prisma.studySession.findMany({
      where: { userId: user.id, completed: true },
      orderBy: { endedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ stats, topicProgress, streak, recentSessions });
}
