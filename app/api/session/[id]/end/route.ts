import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const EndSchema = z.object({
  durationSec: z.number().int().min(0),
  xpEarned: z.number().int().min(0),
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
});

const FULL_SESSION_SECONDS = 60 * 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json();
  const parsed = EndSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { durationSec, xpEarned, correct, total } = parsed.data;

  const session = await prisma.studySession.findFirst({ where: { id, userId: user.id } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMath = session.subject === "math";
  const now = new Date();
  const streakEarned = durationSec >= FULL_SESSION_SECONDS;

  // Determine streak update
  const streak = await prisma.streak.findUnique({ where: { userId: user.id } });
  let newCurrent = streak?.current ?? 0;
  let newLongest = streak?.longest ?? 0;

  if (streakEarned && streak?.lastStudied) {
    const lastDate = new Date(streak.lastStudied);
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
    if (diffDays === 0) {
      newCurrent = streak.current;
    } else if (diffDays === 1) {
      newCurrent = streak.current + 1;
    } else {
      newCurrent = 1;
    }
    newLongest = Math.max(newLongest, newCurrent);
  } else if (streakEarned) {
    newCurrent = 1;
    newLongest = Math.max(newLongest, 1);
  }

  const updates: Prisma.PrismaPromise<unknown>[] = [
    // End session
    prisma.studySession.update({
      where: { id },
      data: { completed: true, endedAt: now, durationSec, xpEarned, correct, total },
    }),
    // Upsert topic progress
    prisma.topicProgress.upsert({
      where: { userId_topicId: { userId: user.id, topicId: session.topicId } },
      create: {
        userId: user.id,
        subject: session.subject,
        topicId: session.topicId,
        xp: xpEarned,
        correct,
        total,
        lastPracticed: now,
      },
      update: {
        xp: { increment: xpEarned },
        correct: { increment: correct },
        total: { increment: total },
        lastPracticed: now,
      },
    }),
    // Update user stats
    prisma.userStats.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        totalXP: xpEarned,
        mathXP: isMath ? xpEarned : 0,
        elaXP: isMath ? 0 : xpEarned,
        totalSessions: 1,
        mathSessions: isMath ? 1 : 0,
        elaSessions: isMath ? 0 : 1,
        mathCorrect: isMath ? correct : 0,
        mathTotal: isMath ? total : 0,
        elaCorrect: isMath ? 0 : correct,
        elaTotal: isMath ? 0 : total,
      },
      update: {
        totalXP: { increment: xpEarned },
        mathXP: isMath ? { increment: xpEarned } : undefined,
        elaXP: !isMath ? { increment: xpEarned } : undefined,
        totalSessions: { increment: 1 },
        mathSessions: isMath ? { increment: 1 } : undefined,
        elaSessions: !isMath ? { increment: 1 } : undefined,
        mathCorrect: isMath ? { increment: correct } : undefined,
        mathTotal: isMath ? { increment: total } : undefined,
        elaCorrect: !isMath ? { increment: correct } : undefined,
        elaTotal: !isMath ? { increment: total } : undefined,
      },
    }),
  ];

  if (streakEarned) {
    updates.push(
    // Update streak
      prisma.streak.upsert({
        where: { userId: user.id },
        create: { userId: user.id, current: 1, longest: 1, lastStudied: now },
        update: { current: newCurrent, longest: newLongest, lastStudied: now },
      })
    );
  }

  await prisma.$transaction(updates);

  return NextResponse.json({ ok: true, xpEarned, streak: newCurrent, streakEarned });
}
