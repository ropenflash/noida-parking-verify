/** Date-only compare (YYYY-MM-DD). Missing bounds are not an active authorisation. */
export function toDateOnly(value: Date | string): string {
  if (typeof value === "string") {
    const iso = value.includes("T") ? value.slice(0, 10) : value;
    return iso;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isActiveOn(
  start: string | null | undefined,
  end: string | null | undefined,
  on: Date | string,
): boolean {
  if (!start || !end) return false;
  const day = toDateOnly(on);
  const from = start.slice(0, 10);
  const until = end.slice(0, 10);
  return day >= from && day <= until;
}

export function classifyDistance(
  meters: number,
  exactMeters: number,
  nearbyMeters: number,
): "EXACT_MATCH" | "NEARBY_MATCH" | "NO_MATCH" {
  if (meters <= exactMeters) return "EXACT_MATCH";
  if (meters <= nearbyMeters) return "NEARBY_MATCH";
  return "NO_MATCH";
}
