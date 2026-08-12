/**
 * Shared date/duration formatting.
 *
 * Every function is total: invalid, absent, or nonsensical input returns
 * `null` rather than throwing or rendering "Invalid Date"/"NaNmo ago".
 * Callers can therefore render the result unconditionally.
 *
 * No date library — the project intentionally ships none.
 */

/** Milliseconds since epoch, or `null` if the input is not a usable date. */
function toTime(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Coarse relative time: "Just now" / "5m ago" / "3h ago" / "Yesterday" /
 * "4d ago" / "2w ago" / "3mo ago" / "2y ago". Future timestamps clamp to
 * "Just now" — a device clock running fast should not read "in 3 hours".
 */
export function formatRelativeTime(
  value: string | number | Date | null | undefined,
  now: number = Date.now(),
): string | null {
  const t = toTime(value);
  if (t === null) return null;

  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Human uptime from a seconds count: "just booted" / "14m" / "2h 14m" / "3d 4h".
 * Rejects negatives and non-finite values.
 */
export function formatUptime(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null;

  const total = Math.floor(seconds);
  if (total < 60) return "just booted";

  const mins = Math.floor(total / 60);
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const rem = mins % 60;
    return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
  }

  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem === 0 ? `${days}d` : `${days}d ${rem}h`;
}

/** Full locale timestamp, for tooltips and `title` attributes. */
export function formatAbsolute(value: string | number | Date | null | undefined): string | null {
  const t = toTime(value);
  return t === null ? null : new Date(t).toLocaleString();
}

/** True when `value` is a valid timestamp no older than `maxAgeMs`. */
export function isFresh(
  value: string | number | Date | null | undefined,
  maxAgeMs: number,
  now: number = Date.now(),
): boolean {
  const t = toTime(value);
  if (t === null) return false;
  return now - t <= maxAgeMs;
}

/** Age in milliseconds, or `null` if the input is unusable. */
export function ageMs(
  value: string | number | Date | null | undefined,
  now: number = Date.now(),
): number | null {
  const t = toTime(value);
  return t === null ? null : now - t;
}
