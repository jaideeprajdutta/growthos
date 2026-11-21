import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const BASE =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:opacity-60";

export function Textarea({ label, hint, error, className, ...props }: TextareaProps) {
  const textareaId = props.id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <label htmlFor={textareaId} className="text-sm font-medium text-fg">{label}</label> : null}
      <textarea id={textareaId} className={cn(BASE, "min-h-24 resize-y", error && "border-destructive", className)} {...props} />
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}
