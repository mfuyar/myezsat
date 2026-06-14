import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, forbidden } from "@/lib/api/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { id }, include: { participants: true } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myEntry = challenge.participants.find((p) => p.userId === user.id);
  if (!myEntry) return forbidden();
  if (challenge.status !== "pending") return NextResponse.json({ error: "Challenge already started" }, { status: 400 });

  await prisma.challenge.update({ where: { id }, data: { status: "active" } });

  return NextResponse.json({ questionIds: challenge.questionIds, timeLimitMin: challenge.timeLimitMin });
}
