import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

const TEST_RANGES: Record<string, { min: number; max: number; sectionMin: number; sectionMax: number }> = {
  sat:        { min: 400,  max: 1600, sectionMin: 200, sectionMax: 800 },
  practice:   { min: 400,  max: 1600, sectionMin: 200, sectionMax: 800 },
  psat_nmsqt: { min: 320,  max: 1520, sectionMin: 160, sectionMax: 760 },
  psat10:     { min: 320,  max: 1520, sectionMin: 160, sectionMax: 760 },
  psat89:     { min: 240,  max: 1440, sectionMin: 120, sectionMax: 720 },
};

const PostSchema = z.object({
  testType: z.enum(["sat", "psat_nmsqt", "psat10", "psat89", "practice"]),
  testName: z.string().max(120).optional(),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mathScore: z.number().int(),
  rwScore: z.number().int(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const entries = await prisma.scoreEntry.findMany({
    where: { userId: user.id },
    orderBy: [
      { testDate: "desc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { testType, testName, testDate, mathScore, rwScore, notes } = parsed.data;
  const range = TEST_RANGES[testType];

  if (
    mathScore < range.sectionMin || mathScore > range.sectionMax ||
    rwScore   < range.sectionMin || rwScore   > range.sectionMax
  ) {
    return NextResponse.json(
      { error: `Scores out of range for ${testType} (${range.sectionMin}–${range.sectionMax} per section)` },
      { status: 400 }
    );
  }

  const totalScore = mathScore + rwScore;
  const entry = await prisma.scoreEntry.create({
    data: {
      userId: user.id,
      testType,
      testName: testName || null,
      testDate: new Date(testDate),
      mathScore,
      rwScore,
      totalScore,
      notes: notes || null,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
