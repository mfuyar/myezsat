import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/auth";
import { genai } from "@/lib/ai/stream";
import { z } from "zod";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ScoreAnalysisSchema = z.object({
  testType: z.enum(["sat", "psat_nmsqt", "psat10", "psat89", "practice"]).nullable(),
  testName: z.string().max(120).nullable(),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  mathScore: z.number().int().nullable(),
  rwScore: z.number().int().nullable(),
  totalScore: z.number().int().nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(500).nullable(),
});

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return cleaned;
  return cleaned.slice(start, end + 1);
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const formData = await req.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a score screenshot." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Use a PNG, JPG, or WebP screenshot." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Screenshot must be under 6 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" } as Parameters<typeof genai.getGenerativeModel>[0]["generationConfig"],
  });

  const prompt = `Read this College Board, SAT, PSAT, or practice-test score screenshot.

Return ONLY JSON with this exact shape:
{
  "testType": "sat" | "psat_nmsqt" | "psat10" | "psat89" | "practice" | null,
  "testName": string | null,
  "testDate": "YYYY-MM-DD" | null,
  "mathScore": number | null,
  "rwScore": number | null,
  "totalScore": number | null,
  "confidence": number,
  "notes": string | null
}

Rules:
- Use "rwScore" for Evidence-Based Reading and Writing / Reading and Writing / ERW.
- If the screenshot is a College Board SAT score, testType is "sat".
- If it is a PSAT/NMSQT, PSAT 10, or PSAT 8/9 score, use the matching testType.
- If it is a practice test score, use "practice".
- Only return numbers clearly visible in the image.
- If a field is unclear, use null and explain briefly in notes.
- Do not guess a date if one is not visible.`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: buffer.toString("base64"), mimeType: file.type } },
    ]);
    const raw = result.response.text();
    const parsedJson = JSON.parse(extractJson(raw));
    const parsed = ScoreAnalysisSchema.safeParse(parsedJson);

    if (!parsed.success) {
      return NextResponse.json({ error: "Could not read score details from that screenshot." }, { status: 422 });
    }

    return NextResponse.json({ score: parsed.data });
  } catch {
    return NextResponse.json({ error: "Could not analyze the screenshot. Try a clearer image." }, { status: 500 });
  }
}
