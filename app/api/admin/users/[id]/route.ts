import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api/auth";
import { z } from "zod";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"),   reason: z.string().min(1).max(500) }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("delete"),    reason: z.string().min(1).max(500) }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("set_role"),  role: z.enum(["student", "parent", "tutor", "admin"]) }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin"]);
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });

  const body = await req.json();
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, deletedAt: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const now = new Date();

  if (parsed.data.action === "suspend") {
    await prisma.user.update({
      where: { id },
      data: { suspended: true, suspendedAt: now, suspendedBy: user.id, suspendReason: parsed.data.reason },
    });
  } else if (parsed.data.action === "unsuspend") {
    await prisma.user.update({ where: { id }, data: { suspended: false, suspendedAt: null, suspendedBy: null, suspendReason: null } });
  } else if (parsed.data.action === "delete") {
    await prisma.user.update({ where: { id }, data: { deletedAt: now, deletedBy: user.id, suspended: true } });
  } else if (parsed.data.action === "restore") {
    await prisma.user.update({ where: { id }, data: { deletedAt: null, deletedBy: null, suspended: false } });
  } else if (parsed.data.action === "set_role") {
    await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });
  }

  return NextResponse.json({ ok: true });
}
