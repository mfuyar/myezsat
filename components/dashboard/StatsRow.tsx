import { formatXP } from "@/lib/utils";
import type { UserStats, Streak } from "@/types";

interface StatsRowProps {
  stats: UserStats | null;
  streak: Streak | null;
}

export default function StatsRow({ stats, streak }: StatsRowProps) {
  const items = [
    { label: "Math XP", value: formatXP(stats?.mathXP ?? 0), color: "var(--math)" },
    { label: "ELA XP", value: formatXP(stats?.elaXP ?? 0), color: "var(--ela)" },
    { label: "Day Streak", value: String(streak?.current ?? 0), color: "var(--text)", suffix: "🔥" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="card p-4 flex flex-col gap-1"
        >
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium">
            {item.label}
          </p>
          <p
            className="text-2xl font-mono font-semibold"
            style={{ color: item.color }}
          >
            {item.value}
            {item.suffix && <span className="ml-1 text-xl">{item.suffix}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
