import { z } from "zod";
import { genai } from "@/lib/ai/stream";
import { ORIGINAL_SAT_CONTENT_GUIDANCE } from "@/lib/ai/prompts";
import { prisma } from "@/lib/prisma";
import { ELA_TOPICS, MATH_TOPICS, type Difficulty, type Subject } from "@/types";

const GeneratedQuestionSchema = z.object({
  subtopic: z.string().max(80).optional(),
  passage: z.string().max(1800).nullable().optional(),
  question: z.string().min(10).max(1200),
  choiceA: z.string().min(1).max(600),
  choiceB: z.string().min(1).max(600),
  choiceC: z.string().min(1).max(600),
  choiceD: z.string().min(1).max(600),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(20).max(1800),
});

const GeneratedQuestionsSchema = z.array(GeneratedQuestionSchema).min(1).max(10);

function topicLabel(subject: Subject, topicId: string) {
  const topics = subject === "math" ? MATH_TOPICS : ELA_TOPICS;
  return topics.find((topic) => topic.id === topicId)?.label ?? topicId.replace(/-/g, " ");
}

function fallbackTopic(subject: Subject) {
  return subject === "math" ? MATH_TOPICS[0].id : ELA_TOPICS[0].id;
}

export async function generateAndStoreQuestions({
  subject,
  topicId,
  difficulty,
  count,
}: {
  subject: Subject;
  topicId?: string;
  difficulty: Difficulty;
  count: number;
}) {
  const targetTopicId = topicId ?? fallbackTopic(subject);
  const targetCount = Math.min(Math.max(count, 1), 10);
  const sourceFile = `ai-generated-${subject}-${targetTopicId}`;

  const subjectLabel = subject === "math" ? "SAT Math" : "SAT Reading and Writing";
  const prompt = `You are creating original practice questions for MyEzSAT's reusable question bank.

${ORIGINAL_SAT_CONTENT_GUIDANCE}

Subject: ${subjectLabel}
Topic ID: ${targetTopicId}
Topic label: ${topicLabel(subject, targetTopicId)}
Difficulty: ${difficulty}
Count: ${targetCount}

Generate exactly ${targetCount} original SAT-style multiple-choice questions.

Requirements:
- Use the same skill patterns and level as the SAT, but do not copy or closely paraphrase any official question.
- Each question must have four answer choices: A, B, C, and D.
- For Math, write equations in plain text and make questions solvable without images.
- For Reading and Writing, include a short passage only when the question needs one; use original passages.
- Explanations should teach the rule or reasoning clearly.
- Do not include citations unless a user-provided source is explicitly being discussed.

Return ONLY a valid JSON array:
[
  {
    "subtopic": "short subtopic",
    "passage": null,
    "question": "...",
    "choiceA": "...",
    "choiceB": "...",
    "choiceC": "...",
    "choiceD": "...",
    "correctAnswer": "A",
    "explanation": "..."
  }
]`;

  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } as Parameters<typeof genai.getGenerativeModel>[0]["generationConfig"],
  });

  const result = await model.generateContent(prompt);
  const parsed = GeneratedQuestionsSchema.safeParse(JSON.parse(result.response.text()));
  if (!parsed.success) {
    throw new Error("Generated questions did not match the expected format.");
  }

  const maxNum = await prisma.sATQuestion.findFirst({
    where: { sourceFile },
    orderBy: { questionNum: "desc" },
    select: { questionNum: true },
  });
  const startNum = (maxNum?.questionNum ?? 0) + 1;

  return prisma.$transaction(
    parsed.data.map((question, index) =>
      prisma.sATQuestion.create({
        data: {
          subject,
          topicId: targetTopicId,
          subtopic: question.subtopic ?? null,
          difficulty,
          sourceFile,
          questionNum: startNum + index,
          hasImage: false,
          passage: question.passage ?? null,
          question: question.question,
          choiceA: question.choiceA,
          choiceB: question.choiceB,
          choiceC: question.choiceC,
          choiceD: question.choiceD,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        },
        select: { id: true },
      })
    )
  );
}
