import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendVocabEmail } from "@/lib/vocab-email";
import { z } from "zod";

async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "admin" || user?.role === "tutor";
}

const TestSendSchema = z.object({
  email: z.string().email().optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
