import { greet, todayLabel } from "@/lib/utils";
import StreakBadge from "./StreakBadge";

interface DashboardHeaderProps {
  name: string | null;
  streak: number;
}

export default function DashboardHeader({ name, streak }: DashboardHeaderProps) {
  const displayName = name ?? "there";

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          {greet()},{" "}
          <span className="font-serif italic text-[var(--math)]">{displayName}.</span>
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">{todayLabel()}</p>
      </div>
      <StreakBadge current={streak} />
    </div>
  );
}
