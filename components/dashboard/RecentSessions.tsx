"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import { formatDuration, pct } from "@/lib/utils";

type RecentSession = {
  id: string;
  subject: string;
  topicLabel: string;
  durationSec: number;
  xpEarned: number;
  correct: number;
  total: number;
  endedAt: string | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
};

function dayLabel(date: string | null) {
  if (!date) return "Session";

  const ended = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (ended.toDateString() === today.toDateString()) return "Today";
  if (ended.toDateString() === yesterday.toDateString()) return "Yesterday";

  return ended.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullDateLabel(date: string | null) {
  if (!date) return "Session";

  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function preview(content: string) {
  return content.length > 180 ? `${content.slice(0, 180).trim()}...` : content;
}

export default function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  const [openSessionId, setOpenSessionId] = useState<string | null>(sessions[0]?.id ?? null);

  const openSession = useMemo(
    () => sessions.find((session) => session.id === openSessionId) ?? null,
    [openSessionId, sessions]
  );

  if (sessions.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">
          Recent Sessions
        </h2>
        <span className="text-xs text-[var(--muted)]">Last 5</span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Subject", "Topic", "Duration", "XP", "Accuracy"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[var(--muted)] font-medium uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => {
              const isOpen = s.id === openSessionId;
              return (
                <tr
                  key={s.id}
                  onClick={() => setOpenSessionId(isOpen ? null : s.id)}
                  className={`${i < sessions.length - 1 ? "border-b border-[var(--border)]" : ""} cursor-pointer transition-colors hover:bg-[var(--s2)] ${isOpen ? "bg-[var(--s2)]" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge variant={s.subject as "math" | "ela"}>
                        {s.subject === "math" ? "Math" : "ELA"}
                      </Badge>
                      <span className="text-[10px] text-[var(--muted)]">{dayLabel(s.endedAt)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">{s.topicLabel}</td>
                  <td className="px-4 py-3 font-mono text-[var(--muted)]">
                    {formatDuration(s.durationSec)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--math)]">+{s.xpEarned}</td>
                  <td className="px-4 py-3 font-mono text-[var(--muted)]">
                    {pct(s.correct, s.total)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openSession && (
        <div className="mt-3 grid gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--s2)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant={openSession.subject as "math" | "ela"}>
                  {openSession.subject === "math" ? "Math" : "ELA"}
                </Badge>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{openSession.topicLabel}</p>
                  <p className="text-xs text-[var(--muted)]">{fullDateLabel(openSession.endedAt)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Duration</p>
                  <p className="font-mono text-sm text-[var(--text)]">{formatDuration(openSession.durationSec)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">XP</p>
                  <p className="font-mono text-sm text-[var(--math)]">+{openSession.xpEarned}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Accuracy</p>
                  <p className="font-mono text-sm text-[var(--text)]">{pct(openSession.correct, openSession.total)}%</p>
                </div>
              </div>
            </div>
          </div>

          {openSession.messages.length === 0 ? (
            <div className="card p-4 text-sm text-[var(--muted)]">
              No saved questions for this session yet.
            </div>
          ) : (
            openSession.messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className="card p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                      {isUser ? "Your answer" : `AI question ${index + 1}`}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">
                      {new Date(message.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
                    {preview(message.content)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
