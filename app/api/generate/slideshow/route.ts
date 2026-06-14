import { NextResponse } from "next/server";
import { genai } from "@/lib/ai/stream";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { z } from "zod";

const Schema = z.object({
  subject: z.enum(["math", "ela"]),
  topicLabel: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  regenerate: z.boolean().default(false),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, topicLabel, difficulty, regenerate } = parsed.data;
  const cacheKey = { userId: user.id, toolType: "slideshow", subject, topicLabel, difficulty, mode: "" };

  if (!regenerate) {
    const cached = await prisma.studyContentCache.findUnique({ where: { userId_toolType_subject_topicLabel_difficulty_mode: cacheKey } });
    if (cached) return NextResponse.json({ slides: cached.content, fromCache: true });
  }

  const subjectLabel = subject === "math" ? "Math" : "English (Reading & Writing)";
  const prompt = `You are an expert SAT tutor creating a mini-lesson presentation.

Subject: SAT ${subjectLabel}
Topic: ${topicLabel}
Difficulty: ${difficulty}

Generate exactly 8 slides for a clear, teacher-style presentation on this topic. Think of it as a mini-lecture a great teacher would give.

Slide structure:
- Slide 1: Introduction — what this topic is and why it matters for the SAT
- Slides 2–6: Core concepts, rules, formulas, or strategies (one focused idea per slide)
- Slide 7: Common mistakes to avoid
- Slide 8: Quick summary and key takeaways

Rules:
- "title": short, clear (5–8 words max)
- "content": 2–4 clear sentences explaining the concept at ${difficulty} level
- "example": a short SAT-style example, formula, or mnemonic (can be empty string if not applicable)

Return ONLY a valid JSON array, no markdown, no extra text:
[
  {"id": 1, "title": "...", "content": "...", "example": "..."},
  ...
]`;

  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } as Parameters<typeof genai.getGenerativeModel>[0]["generationConfig"],
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let slides;
  try {
    slides = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  await prisma.studyContentCache.upsert({
    where: { userId_toolType_subject_topicLabel_difficulty_mode: cacheKey },
    create: { ...cacheKey, content: slides },
    update: { content: slides },
  });

  return NextResponse.json({ slides, fromCache: false });
}
