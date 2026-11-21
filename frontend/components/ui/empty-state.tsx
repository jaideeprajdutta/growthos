import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-line bg-bg-muted p-10 text-center", className)}>
      {icon ? <div className="text-fg-muted">{icon}</div> : null}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
