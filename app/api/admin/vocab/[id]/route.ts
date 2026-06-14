import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api/auth";
import { z } from "zod";

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
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;

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
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;

  const { id } = await params;
  await prisma.vocabWord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
