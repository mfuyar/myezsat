import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXP, canAwardPoints, XP_RULES } from "@/lib/game/points";
import { updateQuestProgress } from "@/lib/game/quests";
import { checkAndAwardBadges } from "@/lib/game/badges";
import { z } from "zod";

const Schema = z.object({
  sessionId: z.string(),
  satQuestionId: z.string(),
  selectedAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
  timeSpentSec: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId, satQuestionId, selectedAnswer, timeSpentSec } = parsed.data;

  const [session, question] = await Promise.all([
    prisma.practiceSession.findUnique({ where: { id: sessionId } }),
    prisma.sATQuestion.findUnique({ where: { id: satQuestionId } }),
  ]);

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = selectedAnswer === question.correctAnswer;

  const attempt = await prisma.practiceAttempt.create({
    data: { sessionId, userId: user.id, satQuestionId, selectedAnswer, isCorrect, timeSpentSec },
  });

  if (isCorrect) {
    await prisma.practiceSession.update({ where: { id: sessionId }, data: { correct: { increment: 1 } } });
  }

  // Server-side XP award (anti-cheat enforced)
  let xpAwarded = 0;
  let leveledUp = false;
  let newLevel = 1;
  if (isCorrect && timeSpentSec >= 5 && await canAwardPoints(user.id, satQuestionId)) {
    const actionType = `correct_${question.difficulty}` as keyof typeof XP_RULES;
    const xp = XP_RULES[actionType] ?? 5;
    const result = await awardXP(user.id, actionType, xp, 0, satQuestionId);
    xpAwarded = result.xpAwarded;
    leveledUp = result.leveledUp;
    newLevel = result.newLevel;

    // Quest + badge checks (non-blocking)
    Promise.all([
      updateQuestProgress(user.id, { type: "answer_questions", count: 1 }),
      checkAndAwardBadges(user.id),
    ]).catch(() => {});
  }

  return NextResponse.json({
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    attemptId: attempt.id,
    xpAwarded,
    leveledUp,
    newLevel,
  });
}
