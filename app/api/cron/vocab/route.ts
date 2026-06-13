import { NextResponse } from "next/server";
import { sendDueVocabEmails } from "@/lib/vocab-email";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueVocabEmails();
  return NextResponse.json(result);
}
