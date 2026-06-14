import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type ApiUser = {
  id: string;
  email: string;
  role: string;
};

export type AuthResult =
  | { user: ApiUser; response?: never }
  | { user?: never; response: NextResponse };

export async function requireApiUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true, suspended: true, deletedAt: true },
  });

  if (!dbUser) {
    return { response: NextResponse.json({ error: "Account setup required" }, { status: 409 }) };
  }

  if (dbUser.deletedAt) {
    return { response: NextResponse.json({ error: "Account deleted" }, { status: 403 }) };
  }

  if (dbUser.suspended) {
    return { response: NextResponse.json({ error: "Account suspended" }, { status: 403 }) };
  }

  return { user: { id: dbUser.id, email: dbUser.email, role: dbUser.role } };
}

export async function requireApiRole(roles: string[]): Promise<AuthResult> {
  const auth = await requireApiUser();
  if (auth.response) return auth;

  if (!roles.includes(auth.user.role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}

export function isOwner(userId: string, ownerId: string) {
  return userId === ownerId;
}

export function requireOwner(userId: string, ownerId: string) {
  if (isOwner(userId, ownerId)) return null;
  return forbidden();
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
