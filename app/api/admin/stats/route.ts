import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;

  const [totalQ, totalUsers, totalSessions, topicBreakdown] = await Promise.all([
    prisma.sATQuestion.count(),
    prisma.user.count(),
    prisma.practiceSession.count({ where: { completed: true } }),
    prisma.sATQuestion.groupBy({ by: ["topicId", "difficulty"], _count: { id: true } }),
  ]);

  return NextResponse.json({ totalQ, totalUsers, totalSessions, topicBreakdown });
}
