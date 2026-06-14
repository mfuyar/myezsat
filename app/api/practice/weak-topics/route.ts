import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const attempts = await prisma.practiceAttempt.findMany({
    where: { userId: user.id },
    select: { isCorrect: true, satQuestion: { select: { topicId: true, subject: true, difficulty: true } } },
  });

  const stats: Record<string, { topicId: string; subject: string; correct: number; total: number }> = {};
  for (const a of attempts) {
    const key = a.satQuestion.topicId;
    if (!stats[key]) stats[key] = { topicId: key, subject: a.satQuestion.subject, correct: 0, total: 0 };
    stats[key].total++;
    if (a.isCorrect) stats[key].correct++;
  }

  const topics = Object.values(stats)
    .filter((s) => s.total >= 3)
    .map((s) => ({ ...s, accuracy: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const weak = topics.filter((t) => t.accuracy < 70);
  const strong = topics.filter((t) => t.accuracy >= 85);

  return NextResponse.json({ weak, strong, all: topics });
}
