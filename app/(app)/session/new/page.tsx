import Link from "next/link";
import { redirect } from "next/navigation";
import TopicSetup from "@/components/session/TopicSetup";
import type { Subject } from "@/types";

interface Props {
  searchParams: Promise<{ subject?: string }>;
}

export default async function NewSessionPage({ searchParams }: Props) {
  const { subject: rawSubject } = await searchParams;
  const subject: Subject =
    rawSubject === "ela" ? "ela" : rawSubject === "math" ? "math" : "math";

  if (!rawSubject) redirect("/session/new?subject=math");

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          ← Dashboard
        </Link>
        <span className="font-serif italic text-xl text-[var(--text)]">myezsat</span>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <TopicSetup subject={subject} />
      </main>
    </div>
  );
}
