"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { Topic, Subject } from "@/types";

interface SessionCardProps {
  subject: Subject;
  topics: Topic[];
  suggested?: boolean;
}

export default function SessionCard({ subject, topics, suggested }: SessionCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isMath = subject === "math";
  const color = isMath ? "var(--math)" : "var(--ela)";
  const label = isMath ? "Math" : "ELA";

  async function handleStart() {
    setLoading(true);
    router.push(`/session/new?subject=${subject}`);
  }

  return (
    <Card
      subject={subject}
      hover
      onClick={handleStart}
      className="p-5 flex flex-col gap-4 relative overflow-hidden"
    >
      {suggested && (
        <span
          className="absolute top-0 right-0 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-bl-lg"
          style={{ background: isMath ? "var(--math-bg)" : "var(--ela-bg)", color }}
        >
          Suggested today
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
          style={{ background: isMath ? "var(--math-bg)" : "var(--ela-bg)", color }}
        >
          {isMath ? "Σ" : "A"}
        </div>
        <div>
          <p className="font-semibold text-[var(--text)]">{label}</p>
          <p className="text-xs text-[var(--muted)]">SAT {label}</p>
        </div>
        <Badge variant="muted" className="ml-auto">60 min</Badge>
      </div>

      <ul className="flex flex-col gap-1.5">
        {topics.slice(0, 5).map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
            {t.label}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-3 border-t border-[var(--border)]">
        <span
          className="text-sm font-medium"
          style={{ color }}
        >
          {loading ? "Starting…" : "Start session →"}
        </span>
      </div>
    </Card>
  );
}
