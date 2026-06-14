import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVocabEmail } from "@/lib/vocab-email";
import { requireApiRole } from "@/lib/api/auth";
import { z } from "zod";

const TestSendSchema = z.object({
  email: z.string().email().optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiRole(["admin", "tutor"]);
  if (auth.response) return auth.response;
  const { user } = auth;

  const parsed = TestSendSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true },
  });

  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const result = await sendVocabEmail({
    userId: user.id,
    to: parsed.data.email ?? dbUser.email,
    name: dbUser.name,
    dryRun: parsed.data.dryRun ?? false,
    updateSubscription: false,
  });

  return NextResponse.json(result);
}
