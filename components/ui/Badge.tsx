import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "math" | "ela" | "green" | "red" | "muted" | "default";
}

export default function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-[var(--s3)] text-[var(--text)] border border-[var(--border)]",
    math: "bg-[var(--math-bg)] text-[var(--math)] border border-[var(--math)]/30",
    ela: "bg-[var(--ela-bg)] text-[var(--ela)] border border-[var(--ela)]/30",
    green: "bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30",
    red: "bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30",
    muted: "bg-[var(--s2)] text-[var(--muted)] border border-[var(--border)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-mono",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
