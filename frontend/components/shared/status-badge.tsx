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
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <Badge color={COLORS[status] ?? "default"} className={className}>{status.replace(/_/g, " ")}</Badge>;
}
