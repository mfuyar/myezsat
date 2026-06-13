import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  subject: z.enum(["math", "ela"]),
  topicId: z.string().min(1),
  topicLabel: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, topicId, topicLabel, difficulty } = parsed.data;

  // Ensure the user row exists (first-time login via OAuth may skip /api/auth/setup)
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      stats: { create: {} },
      streak: { create: {} },
    },
    update: {},
  });

  const session = await prisma.studySession.create({
    data: { userId: user.id, subject, topicId, topicLabel, difficulty },
  });

  return NextResponse.json({ session });
}
