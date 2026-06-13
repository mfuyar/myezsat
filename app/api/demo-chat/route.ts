import { genai } from "@/lib/ai/stream";
import { MATH_SYSTEM, ELA_SYSTEM } from "@/lib/ai/prompts";
import { z } from "zod";

const ChatSchema = z.object({
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
  const body = await req.json();
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }

  const { messages, subject, topicLabel, difficulty } = parsed.data;
  const systemInstruction = subject === "math" ? MATH_SYSTEM : ELA_SYSTEM;

  const taggedMessages = messages.map((m, i) =>
    i === messages.length - 1 && m.role === "user"
      ? { ...m, content: `[Topic: ${topicLabel}] [Difficulty: ${difficulty}]\n${m.content}` }
      : m
  );

  const history = taggedMessages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const userContent = taggedMessages[taggedMessages.length - 1].content;

  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
  });

  const chat = model.startChat({ history });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await chat.sendMessageStream(userContent);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }
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
