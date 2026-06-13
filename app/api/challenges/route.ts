import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await prisma.challengeParticipant.findMany({
    where: { userId: user.id },
    include: {
      challenge: {
        include: {
          participants: { include: { user: { select: { id: true, gameProfile: { select: { username: true, level: true } } } } } },
        },
      },
    },
    orderBy: { challenge: { createdAt: "desc" } },
    take: 20,
  });

  return NextResponse.json({ challenges });
}

const CreateSchema = z.object({
  targetUsername: z.string().min(3),
  subject: z.enum(["math", "ela"]),
  topicId: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  questionCount: z.number().int().min(5).max(20).default(10),
  timeLimitMin: z.number().int().min(10).max(60).default(30),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { targetUsername, subject, topicId, difficulty, questionCount, timeLimitMin } = parsed.data;

  const target = await prisma.gameProfile.findUnique({ where: { username: targetUsername }, select: { userId: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.userId === user.id) return NextResponse.json({ error: "Can't challenge yourself" }, { status: 400 });

  const where: Record<string, unknown> = { subject, difficulty };
  if (topicId) where.topicId = topicId;

  const pool = await prisma.sATQuestion.findMany({ where, select: { id: true } });
  if (pool.length < questionCount) return NextResponse.json({ error: "Not enough questions" }, { status: 400 });

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, questionCount);
  const questionIds = shuffled.map((q) => q.id);

  const myProfile = await prisma.gameProfile.findUnique({ where: { userId: user.id }, select: { username: true } });
  const expiresAt = new Date(Date.now() + timeLimitMin * 60 * 1000 + 24 * 60 * 60 * 1000);

  const challenge = await prisma.challenge.create({
    data: {
      creatorId: user.id,
      title: `${myProfile?.username ?? "?"} vs ${targetUsername}`,
      subject,
      topicId: topicId ?? null,
      difficulty,
      questionCount,
      timeLimitMin,
      questionIds,
      expiresAt,
      status: "pending",
      participants: {
        create: [
          { userId: user.id },
          { userId: target.userId },
        ],
      },
    },
    include: { participants: true },
  });

  return NextResponse.json({ challenge }, { status: 201 });
}
