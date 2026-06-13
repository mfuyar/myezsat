import { pct } from "@/lib/utils";

interface AccuracyBarProps {
  subject: "math" | "ela";
  correct: number;
  total: number;
}

export default function AccuracyBar({ subject, correct, total }: AccuracyBarProps) {
  const percent = pct(correct, total);
  const color = subject === "math" ? "var(--math)" : "var(--ela)";
  const label = subject === "math" ? "Math Accuracy" : "ELA Accuracy";

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        <p className="font-mono text-sm font-semibold" style={{ color }}>
          {percent}%
        </p>
      </div>
      <div className="h-2 bg-[var(--s3)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <p className="text-xs text-[var(--muted)]">
        {correct} / {total} correct
      </p>
    </div>
  );
}
