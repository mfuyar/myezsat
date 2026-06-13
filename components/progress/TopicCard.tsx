import { pct } from "@/lib/utils";
import type { TopicProgress } from "@/types";
import Badge from "@/components/ui/Badge";

interface TopicCardProps {
  progress: TopicProgress;
  subject: "math" | "ela";
}

export default function TopicCard({ progress, subject }: TopicCardProps) {
  const percent = pct(progress.correct, progress.total);
  const color = subject === "math" ? "var(--math)" : "var(--ela)";
  const lastDate = progress.lastPracticed
    ? new Date(progress.lastPracticed).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never";

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-[var(--text)] text-sm">{progress.topicId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">Last: {lastDate}</p>
        </div>
        <Badge variant={subject}>{progress.xp} XP</Badge>
      </div>

      <div>
        <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
          <span>Accuracy</span>
          <span className="font-mono" style={{ color }}>{percent}%</span>
        </div>
        <div className="h-1.5 bg-[var(--s3)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${percent}%`, background: color }}
          />
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">{progress.correct}/{progress.total} correct</p>
      </div>
    </div>
  );
}
