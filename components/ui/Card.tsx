import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  subject?: "math" | "ela";
  hover?: boolean;
}

export default function Card({ className, subject, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card transition-border",
        hover && subject === "math" && "hover:border-[var(--math)] cursor-pointer",
        hover && subject === "ela" && "hover:border-[var(--ela)] cursor-pointer",
        hover && !subject && "hover:border-[var(--muted)] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
