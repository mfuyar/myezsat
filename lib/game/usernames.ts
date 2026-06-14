import { prisma } from "@/lib/prisma";

function usernameBase(email?: string | null, name?: string | null) {
  const raw = email?.split("@")[0] || name || "student";
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16) || "student";
}

export async function uniqueUsername(email?: string | null, name?: string | null) {
  const base = usernameBase(email, name);
  const direct = await prisma.gameProfile.findUnique({ where: { username: base } });
  if (!direct) return base;

  for (let i = 0; i < 20; i++) {
    const candidate = `${base.slice(0, 14)}_${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.gameProfile.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }

  return `${base.slice(0, 10)}_${Date.now().toString(36).slice(-6)}`;
}

export async function ensureGameProfile(userId: string) {
  const existing = await prisma.gameProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  return prisma.gameProfile.create({
    data: {
      userId,
      username: await uniqueUsername(user?.email, user?.name),
    },
  });
}
