import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXP } from "@/lib/game/points";
import { updateQuestProgress } from "@/lib/game/quests";
import { checkAndAwardBadges } from "@/lib/game/badges";
import { z } from "zod";

const Schema = z.object({ sessionId: z.string() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId } = parsed.data;

  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: { attempts: { include: { satQuestion: { select: { topicId: true, difficulty: true } } } } },
  });

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: { completed: true, endedAt: new Date() },
  });

  const accuracy = session.attempts.length > 0
    ? Math.round((session.correct / session.attempts.length) * 100)
    : 0;

  // Find weakest topic in this session
  const topicStats: Record<string, { correct: number; total: number }> = {};
  for (const a of session.attempts) {
    const t = a.satQuestion.topicId;
    if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
    topicStats[t].total++;
    if (a.isCorrect) topicStats[t].correct++;
  }

  const weakest = Object.entries(topicStats)
    .map(([t, s]) => ({ topicId: t, pct: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.pct - b.pct)[0];

  // Award session_complete XP for 10+ question sessions
  let sessionXP = 0;
  let newBadges: string[] = [];
  if (session.attempts.length >= 10) {
    const result = await awardXP(user.id, "session_complete", 20, 10, sessionId);
    sessionXP = result.xpAwarded;
  }

  // Update quest progress
  await updateQuestProgress(user.id, {
    type: "practice_session",
    questionCount: session.attempts.length,
    accuracy,
  });

  newBadges = await checkAndAwardBadges(user.id);

  return NextResponse.json({
    accuracy,
    correct: session.correct,
    total: session.attempts.length,
    weakestTopic: weakest ?? null,
    sessionXP,
    newBadges,
  });
}
