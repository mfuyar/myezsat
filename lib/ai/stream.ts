import { GoogleGenerativeAI } from "@google/generative-ai";

export const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini uses "model" instead of "assistant" for the role name
export type GeminiRole = "user" | "model";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function toGeminiHistory(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));
}
