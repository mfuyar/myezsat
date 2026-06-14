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
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const PAGE_SIZE = 40;

  const where = q
    ? {
        OR: [
          { word: { contains: q, mode: "insensitive" as const } },
          { definition: { contains: q, mode: "insensitive" as const } },
          { category: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [words, total, activeCount, subscriberCount] = await Promise.all([
    prisma.vocabWord.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { word: "asc" },
    }),
    prisma.vocabWord.count({ where }),
    prisma.vocabWord.count({ where: { active: true } }),
    prisma.wordSubscription.count({ where: { enabled: true } }),
  ]);

  return NextResponse.json({
    words,
    total,
    activeCount,
    subscriberCount,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(req: Request) {
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;

  const parsed = WordSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const word = await prisma.vocabWord.create({
    data: {
      ...parsed.data,
      word: parsed.data.word.trim(),
      category: parsed.data.category?.trim() || null,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ word }, { status: 201 });
}
