import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const StartSchema = z.object({
  subject: z.enum(["math", "ela"]),
  topicId: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional(),
  count: z.number().int().min(5).max(50).default(10),
});

async function pickQuestionIds(where: Prisma.SATQuestionWhereInput, take: number) {
  if (take <= 0) return [];

  const total = await prisma.sATQuestion.count({ where });
  if (total === 0) return [];

  const skip = total > take ? Math.floor(Math.random() * (total - take + 1)) : 0;
  const questions = await prisma.sATQuestion.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
    skip,
    take,
  });

  return questions.map((q) => q.id);
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json();
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, topicId, difficulty, count } = parsed.data;

  const baseWhere: Prisma.SATQuestionWhereInput = { subject };
  if (topicId) baseWhere.topicId = topicId;
  if (difficulty && difficulty !== "mixed") baseWhere.difficulty = difficulty;

  const unattemptedWhere: Prisma.SATQuestionWhereInput = {
    ...baseWhere,
    practiceAttempts: { none: { userId: user.id } },
  };
  const attemptedUnmasteredWhere: Prisma.SATQuestionWhereInput = {
    ...baseWhere,
    AND: [
      { practiceAttempts: { some: { userId: user.id } } },
      { practiceAttempts: { none: { userId: user.id, isCorrect: true, masteredAt: { not: null } } } },
    ],
  };

  const freshIds = await pickQuestionIds(unattemptedWhere, count);
  const retryIds = freshIds.length < count
    ? await pickQuestionIds(attemptedUnmasteredWhere, count - freshIds.length)
    : [];
  const questionIds = [...freshIds, ...retryIds];

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions found for these filters" }, { status: 404 });
  }

  const session = await prisma.practiceSession.create({
    data: {
      userId: user.id,
      subject,
      topicId: topicId ?? null,
      difficulty: difficulty && difficulty !== "mixed" ? difficulty : null,
      totalQ: questionIds.length,
    },
  });

  return NextResponse.json({ sessionId: session.id, questionIds, total: questionIds.length });
}

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const sessions = await prisma.practiceSession.findMany({
    where: { userId: user.id, completed: true },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { _count: { select: { attempts: true } } },
  });

  return NextResponse.json({ sessions });
}
