import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardXP } from "@/lib/game/points";
import { checkAndAwardBadges } from "@/lib/game/badges";
import { requireApiUser, forbidden } from "@/lib/api/auth";
import { z } from "zod";

const Schema = z.object({
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])),
  timeSpentSec: z.number().int().min(0),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { answers, timeSpentSec } = parsed.data;

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!challenge || challenge.status !== "active") return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });

  const myEntry = challenge.participants.find((p) => p.userId === user.id);
  if (!myEntry) return forbidden();
  if (myEntry.completedAt) return NextResponse.json({ error: "Already submitted" }, { status: 400 });

  const questionIds = challenge.questionIds as string[];
  const questions = await prisma.sATQuestion.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, correctAnswer: true },
  });

  const answerMap = new Map(questions.map((q) => [q.id, q.correctAnswer]));
  let correct = 0;
  for (const [qId, selected] of Object.entries(answers)) {
    if (answerMap.get(qId) === selected) correct++;
  }

  const accuracy = questions.length > 0 ? correct / questions.length : 0;
  // Score: 70% accuracy + 30% speed bonus (faster = higher, max speed bonus at < 5 min)
  const maxTimeSec = challenge.timeLimitMin * 60;
  const speedBonus = Math.max(0, 1 - timeSpentSec / maxTimeSec);
  const score = accuracy * 0.7 + speedBonus * 0.3;

  await prisma.challengeParticipant.update({
    where: { id: myEntry.id },
    data: { correct, total: questions.length, timeSpentSec, score, completedAt: new Date() },
  });

  // Check if all done
  const allParticipants = await prisma.challengeParticipant.findMany({ where: { challengeId: id } });
  const allDone = allParticipants.every((p) => p.completedAt);

  if (allDone) {
    const sorted = allParticipants.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    await Promise.all(sorted.map((p, i) =>
      prisma.challengeParticipant.update({ where: { id: p.id }, data: { rank: i + 1, xpEarned: i === 0 ? 50 : 10 } })
    ));
    await prisma.challenge.update({ where: { id }, data: { status: "completed" } });

    // Award XP to all; winner gets bonus
    for (const p of sorted) {
      const xp = p.userId === sorted[0].userId ? 50 : 10;
      await awardXP(p.userId, p.userId === sorted[0].userId ? "challenge_win" : "challenge_participate", xp, 0, id);
    }
    await checkAndAwardBadges(sorted[0].userId);
  }

  return NextResponse.json({ correct, total: questions.length, score: Math.round(score * 100), allDone });
}
