export function cn(...classes: unknown[]) {
  return classes.filter((entry): entry is string => typeof entry === "string").join(" ");
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString();
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : `${formatNumber(value, 1)}%`;
}

export function humanLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
