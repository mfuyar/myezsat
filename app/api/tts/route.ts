import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/auth";
import { genai } from "@/lib/ai/stream";

// Gemini TTS voices — Kore is clear and professional (good teacher voice)
const VOICE = "Kore";
const globalForTTS = globalThis as unknown as { ttsCache?: Map<string, Buffer> };
const ttsCache = globalForTTS.ttsCache ?? new Map<string, Buffer>();
globalForTTS.ttsCache = ttsCache;

function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bits = 16): Buffer {
  const byteRate = (sampleRate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "No text" }, { status: 400 });
  }

  // Keep requests short so the good Gemini voice starts quickly during live tutoring.
  const trimmed = text.slice(0, 220);
  const cacheKey = `${VOICE}:${trimmed}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return new Response(cached.buffer.slice(cached.byteOffset, cached.byteOffset + cached.byteLength) as ArrayBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
        "X-TTS-Cache": "hit",
      },
    });
  }

  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash-preview-tts",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (model as any).generateContent({
    contents: [{ role: "user", parts: [{ text: trimmed }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
      },
    },
  });

  const part = result?.response?.candidates?.[0]?.content?.parts?.[0];
  const inlineData = part?.inlineData;

  if (!inlineData?.data) {
    return NextResponse.json({ error: "No audio in response" }, { status: 500 });
  }

  const pcm = Buffer.from(inlineData.data, "base64");
  const wav = pcmToWav(pcm);
  ttsCache.set(cacheKey, wav);
  if (ttsCache.size > 50) {
    const oldest = ttsCache.keys().next().value;
    if (oldest) ttsCache.delete(oldest);
  }

  return new Response(wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
