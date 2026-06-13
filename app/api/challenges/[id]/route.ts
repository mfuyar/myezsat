import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only show question IDs if challenge is active
  const response = {
    ...challenge,
    questionIds: challenge.status === "active" ? challenge.questionIds : [],
  };

  return NextResponse.json({ challenge: response });
}
