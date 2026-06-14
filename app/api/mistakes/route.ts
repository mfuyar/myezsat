import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardXP } from "@/lib/game/points";
import { updateQuestProgress } from "@/lib/game/quests";
import { checkAndAwardBadges } from "@/lib/game/badges";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const mastered = searchParams.get("mastered");

  // Get all incorrect attempts, deduplicated by question (keep latest per question)
  const attempts = await prisma.practiceAttempt.findMany({
    where: {
      userId: user.id,
      isCorrect: false,
      ...(mastered === "true" ? { masteredAt: { not: null } } : mastered === "false" ? { masteredAt: null } : {}),
      satQuestion: topicId ? { topicId } : undefined,
    },
    orderBy: { attemptedAt: "desc" },
    distinct: ["satQuestionId"],
    include: {
      satQuestion: {
        select: {
          id: true, subject: true, topicId: true, difficulty: true,
          question: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true,
          correctAnswer: true, explanation: true, hasImage: true, passage: true,
        },
      },
    },
  });

  return NextResponse.json({ mistakes: attempts });
}

// Mark attempt as mastered
const MasterSchema = z.object({ attemptId: z.string() });

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json();
  const parsed = MasterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const attempt = await prisma.practiceAttempt.findUnique({ where: { id: parsed.data.attemptId } });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const becomingMastered = !attempt.masteredAt;
  await prisma.practiceAttempt.update({
    where: { id: parsed.data.attemptId },
    data: { masteredAt: becomingMastered ? new Date() : null },
  });

  if (becomingMastered) {
    await awardXP(user.id, "mistake_mastered", 15, 5, parsed.data.attemptId);
    Promise.all([
      updateQuestProgress(user.id, { type: "review_mistakes", count: 1 }),
      checkAndAwardBadges(user.id),
    ]).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
