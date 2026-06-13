import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genai } from "@/lib/ai/stream";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  subject: z.enum(["math", "ela"]),
  topicLabel: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  mode: z.enum(["concept", "vocabulary"]).default("concept"),
  regenerate: z.boolean().default(false),
});

function buildPrompt(subject: string, topicLabel: string, difficulty: string, mode: string) {
  if (mode === "vocabulary") {
    return `You are an expert SAT English tutor creating vocabulary flashcards.

Topic: ${topicLabel}
Level: ${difficulty} SAT vocabulary

Generate exactly 12 vocabulary flashcards.

Rules:
- "front": just the word, nothing else (e.g. "Ephemeral")
- "back": part of speech, definition, and one short example sentence
  Format exactly like:
  (adjective) Lasting for a very short time.
  "The ephemeral beauty of cherry blossoms makes them special."

Choose SAT-relevant academic vocabulary that a student should know for the exam.

Return ONLY a valid JSON array, no markdown:
[
  {"id": 1, "front": "Word", "back": "(part of speech) Definition.\\n\\"Example sentence.\\""},
  ...
]`;
  }

  const subjectLabel = subject === "math" ? "Math" : "English (Reading & Writing)";
  return `You are an expert SAT tutor creating study flashcards.

Subject: SAT ${subjectLabel}
Topic: ${topicLabel}
Difficulty: ${difficulty}

Generate exactly 10 flashcards that test key concepts for this SAT topic at the ${difficulty} level.

Rules:
- "front" is a clear question, definition prompt, or concept to identify
- "back" is the concise correct answer (max 3 sentences)
- For math: include formulas, rules, and example calculations
- For ELA: include grammar rules, reading strategies, and patterns
- Vary the types: definitions, rules, examples, apply-the-concept

Return ONLY a valid JSON array, no markdown:
[
  {"id": 1, "front": "...", "back": "..."},
  ...
]`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subject, topicLabel, difficulty, mode, regenerate } = parsed.data;
  const cacheKey = { userId: user.id, toolType: "flashcard", subject, topicLabel, difficulty, mode };

  if (!regenerate) {
    const cached = await prisma.studyContentCache.findUnique({ where: { userId_toolType_subject_topicLabel_difficulty_mode: cacheKey } });
    if (cached) return NextResponse.json({ flashcards: cached.content, fromCache: true });
  }

  const prompt = buildPrompt(subject, topicLabel, difficulty, mode);
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } as Parameters<typeof genai.getGenerativeModel>[0]["generationConfig"],
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let flashcards;
  try {
    flashcards = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  await prisma.studyContentCache.upsert({
    where: { userId_toolType_subject_topicLabel_difficulty_mode: cacheKey },
    create: { ...cacheKey, content: flashcards },
    update: { content: flashcards },
  });

  return NextResponse.json({ flashcards, fromCache: false });
}
