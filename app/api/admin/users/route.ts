import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api/auth";

export async function GET(req: Request) {
  const auth = await requireApiRole(["admin"]);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const PAGE_SIZE = 30;

  const where = {
    deletedAt: null,
    OR: search ? [
      { email: { contains: search, mode: "insensitive" as const } },
      { name: { contains: search, mode: "insensitive" as const } },
      { gameProfile: { username: { contains: search, mode: "insensitive" as const } } },
    ] : undefined,
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, name: true, role: true, suspended: true,
        suspendedAt: true, suspendReason: true, createdAt: true, deletedAt: true,
        gameProfile: { select: { username: true, level: true, totalXP: true } },
        _count: { select: { practiceSessions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, pages: Math.ceil(total / PAGE_SIZE) });
}
