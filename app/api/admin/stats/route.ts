import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "admin" || u?.role === "tutor";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [totalQ, totalUsers, totalSessions, topicBreakdown] = await Promise.all([
    prisma.sATQuestion.count(),
    prisma.user.count(),
    prisma.practiceSession.count({ where: { completed: true } }),
    prisma.sATQuestion.groupBy({ by: ["topicId", "difficulty"], _count: { id: true } }),
  ]);

  return NextResponse.json({ totalQ, totalUsers, totalSessions, topicBreakdown });
}
