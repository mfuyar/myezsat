import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const topicId = searchParams.get("topicId");
  const difficulty = searchParams.get("difficulty");
  const PAGE_SIZE = 50;

  const where: Record<string, unknown> = {};
  if (topicId) where.topicId = topicId;
  if (difficulty) where.difficulty = difficulty;

  const [questions, total] = await Promise.all([
    prisma.sATQuestion.findMany({
      where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      orderBy: [{ topicId: "asc" }, { questionNum: "asc" }],
      select: { id: true, subject: true, topicId: true, difficulty: true, questionNum: true, sourceFile: true, question: true, correctAnswer: true, hasImage: true },
    }),
    prisma.sATQuestion.count({ where }),
  ]);

  return NextResponse.json({ questions, total, pages: Math.ceil(total / PAGE_SIZE) });
}

const CreateSchema = z.object({
  subject: z.enum(["math", "ela"]),
  topicId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  question: z.string().min(10),
  choiceA: z.string().min(1),
  choiceB: z.string().min(1),
  choiceC: z.string().min(1),
  choiceD: z.string().optional(),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(10),
  passage: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const maxNum = await prisma.sATQuestion.findFirst({
    where: { sourceFile: "custom" }, orderBy: { questionNum: "desc" }, select: { questionNum: true },
  });

  const question = await prisma.sATQuestion.create({
    data: {
      ...parsed.data,
      choiceD: parsed.data.choiceD ?? null,
      passage: parsed.data.passage ?? null,
      sourceFile: "custom",
      questionNum: (maxNum?.questionNum ?? 0) + 1,
      hasImage: false,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
