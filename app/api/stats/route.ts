import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      stats: { create: {} },
      streak: { create: {} },
    },
    update: {},
  });

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
