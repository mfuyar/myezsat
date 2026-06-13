import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const challenge = await prisma.challenge.findUnique({ where: { id }, include: { participants: true } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myEntry = challenge.participants.find((p) => p.userId === user.id);
  if (!myEntry) return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  if (challenge.status !== "pending") return NextResponse.json({ error: "Challenge already started" }, { status: 400 });

  await prisma.challenge.update({ where: { id }, data: { status: "active" } });

  return NextResponse.json({ questionIds: challenge.questionIds, timeLimitMin: challenge.timeLimitMin });
}
