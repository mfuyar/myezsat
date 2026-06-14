import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

const CreateSchema = z.object({
  subject: z.enum(["math", "ela"]),
  topicId: z.string().min(1),
  topicLabel: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, topicId, topicLabel, difficulty } = parsed.data;

  const session = await prisma.studySession.create({
    data: { userId: user.id, subject, topicId, topicLabel, difficulty },
  });

  return NextResponse.json({ session });
}
