import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "admin" || user?.role === "tutor";
}

const WordSchema = z.object({
  word: z.string().min(1).max(80),
  partOfSpeech: z.string().min(1).max(40),
  definition: z.string().min(8),
  example: z.string().min(8),
  difficulty: z.enum(["easy", "medium", "hard"]),
  category: z.string().max(60).optional().nullable(),
  active: z.boolean(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = WordSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const word = await prisma.vocabWord.update({
    where: { id },
    data: {
      ...parsed.data,
      word: parsed.data.word.trim(),
      category: parsed.data.category?.trim() || null,
    },
  });

  return NextResponse.json({ word });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.vocabWord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
