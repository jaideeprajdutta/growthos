export function cn(...classes: unknown[]) {
  return classes.filter((entry): entry is string => typeof entry === "string").join(" ");
}
