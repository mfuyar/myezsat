interface XPChartProps {
  sessions: Array<{ endedAt?: string | null; xpEarned: number; subject: string }>;
}

export default function XPChart({ sessions }: XPChartProps) {
  // Build last 7 days buckets
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const buckets = days.map((day) => {
    const dayStr = day.toDateString();
    const dayXP = sessions
      .filter((s) => s.endedAt && new Date(s.endedAt).toDateString() === dayStr)
      .reduce((sum, s) => sum + s.xpEarned, 0);
    return { label: day.toLocaleDateString("en-US", { weekday: "short" }), xp: dayXP };
  });

  const maxXP = Math.max(...buckets.map((b) => b.xp), 1);

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-semibold">
        XP — Last 7 Days
      </p>
      <div className="flex items-end gap-2 h-20">
        {buckets.map((b) => (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm transition-all duration-500" style={{
              height: `${(b.xp / maxXP) * 64}px`,
              minHeight: b.xp > 0 ? "4px" : "0px",
              background: b.xp > 0 ? "var(--math)" : "var(--s3)",
            }} />
            <span className="text-[10px] text-[var(--muted)]">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
