import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, forbidden } from "@/lib/api/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      participants: {
        include: { user: { select: { id: true, gameProfile: { select: { username: true, level: true } } } } },
      },
    },
  });

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isParticipant = challenge.participants.some((p) => p.userId === user.id);
  if (!isParticipant) return forbidden();

  // Only show question IDs if challenge is active
  const response = {
    ...challenge,
    questionIds: challenge.status === "active" ? challenge.questionIds : [],
  };

  return NextResponse.json({ challenge: response });
}
