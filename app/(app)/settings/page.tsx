import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import VocabSettingsForm from "@/components/vocab/VocabSettingsForm";
import MessageDockSettings from "@/components/messages/MessageDockSettings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const subscription = await prisma.wordSubscription.findUnique({ where: { userId: user.id } });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-serif italic text-xl text-[var(--text)] hover:opacity-80 transition-opacity">myezsat</Link>
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">Dashboard</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Settings</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage study reminders and account preferences.</p>
        </div>

        <VocabSettingsForm
          initial={{
            enabled: subscription?.enabled ?? false,
            deliveryHour: subscription?.deliveryHour ?? 8,
            timezone: subscription?.timezone ?? "America/New_York",
            lastSentAt: subscription?.lastSentAt ?? null,
          }}
        />

        <MessageDockSettings />
      </main>
    </div>
  );
}
