import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[var(--text)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-10 w-full rounded-lg bg-[var(--s2)] border border-[var(--border)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--math)]/50 focus:border-[var(--math)]",
            "transition-colors duration-150",
            error && "border-[var(--red)] focus:ring-[var(--red)]/50 focus:border-[var(--red)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--red)]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
