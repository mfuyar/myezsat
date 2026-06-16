import { NextResponse } from "next/server";
import { invokeVocabEmailFunction } from "@/lib/supabase-functions";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await invokeVocabEmailFunction({ action: "send-due" });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send due vocabulary emails." },
      { status: 500 }
    );
  }
}
