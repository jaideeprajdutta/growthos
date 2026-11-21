import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type BadgeColor = "default" | "blue" | "green" | "amber" | "red";

const COLORS: Record<BadgeColor, string> = {
  default: "bg-muted text-fg-muted",
  blue: "bg-accent/10 text-accent",
  green: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
  red: "bg-destructive/10 text-destructive",
};

export function Badge({
  color = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { color?: BadgeColor }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-medium", COLORS[color], className)}
      {...props}
    />
  );
}
