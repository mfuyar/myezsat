interface StreakBadgeProps {
  current: number;
}

export default function StreakBadge({ current }: StreakBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--math-bg)] border border-[var(--math)]/30 streak-pulse">
      <span className="text-base">🔥</span>
      <span className="font-mono text-sm font-semibold text-[var(--math)]">
        {current} day{current !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
