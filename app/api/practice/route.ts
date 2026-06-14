import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

const StartSchema = z.object({
  subject: z.enum(["math", "ela"]),
  topicId: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional(),
  count: z.number().int().min(5).max(50).default(10),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json();
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, topicId, difficulty, count } = parsed.data;

  // Get IDs of questions already answered correctly (exclude mastered ones)
  const masteredIds = await prisma.practiceAttempt.findMany({
    where: { userId: user.id, isCorrect: true, masteredAt: { not: null } },
    select: { satQuestionId: true },
  });
  const masteredSet = new Set(masteredIds.map((a) => a.satQuestionId));

  // Build question filter
  const where: Record<string, unknown> = { subject };
  if (topicId) where.topicId = topicId;
  if (difficulty && difficulty !== "mixed") where.difficulty = difficulty;

  // Prioritize questions not yet attempted (fresh first, then retries)
  const attemptedIds = await prisma.practiceAttempt.findMany({
    where: { userId: user.id },
    select: { satQuestionId: true },
    distinct: ["satQuestionId"],
  });
  const attemptedSet = new Set(attemptedIds.map((a) => a.satQuestionId));

  let questions = await prisma.sATQuestion.findMany({
    where: { ...where, id: { notIn: [...masteredSet] } },
    select: { id: true },
  });

  // Sort: unattempted first, then attempted
  const unattempted = questions.filter((q) => !attemptedSet.has(q.id));
  const attempted = questions.filter((q) => attemptedSet.has(q.id));

  // Shuffle each group
  const shuffle = <T>(arr: T[]) => arr.sort(() => Math.random() - 0.5);
  const pool = [...shuffle(unattempted), ...shuffle(attempted)].slice(0, count);

  if (pool.length === 0) {
    return NextResponse.json({ error: "No questions found for these filters" }, { status: 404 });
  }

  const session = await prisma.practiceSession.create({
    data: {
      userId: user.id,
      subject,
      topicId: topicId ?? null,
      difficulty: difficulty && difficulty !== "mixed" ? difficulty : null,
      totalQ: pool.length,
    },
  });

  return NextResponse.json({ sessionId: session.id, questionIds: pool.map((q) => q.id), total: pool.length });
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
