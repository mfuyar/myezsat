import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { genai, toGeminiHistory } from "@/lib/ai/stream";
import { MATH_SYSTEM, ELA_SYSTEM } from "@/lib/ai/prompts";
import { z } from "zod";

const ChatSchema = z.object({
  sessionId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  subject: z.enum(["math", "ela"]),
  topicLabel: z.string(),
  difficulty: z.string(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId, messages, subject, topicLabel, difficulty } = parsed.data;

  const latestScore = await prisma.scoreEntry.findFirst({
    where: { userId: user.id },
    orderBy: { testDate: "desc" },
    select: { testType: true, testName: true, totalScore: true, mathScore: true, rwScore: true },
  });

  let scoreContext = "";
  if (latestScore) {
    const label = latestScore.testName
      ? `${latestScore.testType.toUpperCase()} (${latestScore.testName})`
      : latestScore.testType.toUpperCase();
    const weakSection =
      Math.abs(latestScore.mathScore - latestScore.rwScore) >= 30
        ? latestScore.mathScore < latestScore.rwScore
          ? "Math is weaker — give extra encouragement and scaffolding on math problems."
          : "Reading & Writing is weaker — push harder on ELA precision and strategy."
        : "Math and Reading & Writing scores are close.";
    scoreContext = `\n\nSTUDENT SCORE CONTEXT:\nLatest ${label}: ${latestScore.totalScore} total (Math: ${latestScore.mathScore}, R&W: ${latestScore.rwScore}). ${weakSection}`;
  }

  const systemInstruction = (subject === "math" ? MATH_SYSTEM : ELA_SYSTEM) + scoreContext;

  // Tag the last user message with topic/difficulty context
  const taggedMessages = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { ...m, content: `[Topic: ${topicLabel}] [Difficulty: ${difficulty}]\n${m.content}` }
      : m
  );

  // Split history (all but last) and current user turn
  const history = toGeminiHistory(taggedMessages.slice(0, -1));
  const userContent = taggedMessages[taggedMessages.length - 1].content;

  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
  });

  const chat = model.startChat({ history });

  let fullText = "";
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await chat.sendMessageStream(userContent);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullText += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }

        // Persist both messages
        const originalUserContent = messages[messages.length - 1]?.content ?? "";
        await prisma.message.createMany({
          data: [
            { sessionId, role: "user", content: originalUserContent },
            { sessionId, role: "assistant", content: fullText },
          ],
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
