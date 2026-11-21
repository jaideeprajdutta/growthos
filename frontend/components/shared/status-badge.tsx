import { Badge } from "@/components/ui/badge";

const COLORS: Record<string, "default" | "blue" | "green" | "amber" | "red"> = {
  proposed: "default",
  prioritized: "blue",
  selected: "green",
  in_progress: "amber",
  completed: "green",
  rejected: "red",
  running: "blue",
  approved: "blue",
  paused: "default",
  cancelled: "red",
  pending: "amber",
  scheduled: "amber",
  executed: "green",
  failed: "red",
  discovered: "amber",
  reviewing: "blue",
  experimenting: "amber",
  implemented: "green",
  archived: "default",
  deferred: "amber",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.replace(/_/g, " ").replace(/(^|\s)\w/g, (char) => char.toUpperCase());
  return <Badge color={COLORS[status] ?? "default"} className={className}>{label}</Badge>;
}
