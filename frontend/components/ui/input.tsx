import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

const BASE =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:opacity-60";

export function Input({ label, hint, error, startIcon, endIcon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <label className="text-sm font-medium text-fg">{label}</label> : null}
      <span className="relative flex items-center">
        {startIcon ? <span className="pointer-events-none text-fg-muted">{startIcon}</span> : null}
        <input className={cn(BASE, error && "border-destructive", startIcon && "pl-10", endIcon && "pr-10", className)} {...props} />
        {endIcon ? <span className="pointer-events-none text-fg-muted">{endIcon}</span> : null}
      </span>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}
