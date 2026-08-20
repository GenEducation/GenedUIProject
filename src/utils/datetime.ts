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

/* ────────────────────────────────────────────────────────────────────────────
   Picker domain: calendar dates (YYYY-MM-DD) and clock times (HH:MM, 24-hour).

   These were previously duplicated across the four picker implementations —
   `toDateString`/`toIso` and `parseDate`/`parseIso` were byte-identical under
   different names, and 12/24-hour conversion existed three separate times.

   Everything here is LOCAL-time. The pickers render a local calendar grid and
   a local clock, so "today" and "tomorrow" must mean the user's day, not UTC's.
   `tomorrowDateString` used to go through `toISOString()`, which in IST
   (UTC+5:30) disagreed with the grid for the last 5.5 hours of every day and
   could offset a `min` bound by one day.
   ──────────────────────────────────────────────────────────────────────────── */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HH_MM_RE = /^(\d{1,2}):(\d{2})$/;

/** `YYYY-MM-DD` → local midnight `Date`, or `null` if unparseable. */
export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  // Rejects overflow like 2026-02-31, which the Date constructor would roll over.
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null;
  return date;
}

/** Local `Date` → `YYYY-MM-DD`, or `null` if the date is unusable. */
export function toIsoDate(date: Date | null | undefined): string | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today in local time as `YYYY-MM-DD`. */
export function todayDateString(now: Date = new Date()): string {
  return toIsoDate(now)!;
}

/** Tomorrow in local time as `YYYY-MM-DD`. The default `min` for scheduling. */
export function tomorrowDateString(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return toIsoDate(d)!;
}

/** Adds (or subtracts) whole days, staying in local time. */
export function addDays(iso: string, days: number): string | null {
  const d = parseIsoDate(iso);
  if (!d) return null;
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export type DateDisplayStyle = "long" | "medium" | "short";

/**
 * The one date format helper. Replaces five divergent inline variants.
 *
 * long   → "Wed, Aug 19, 2026"   (pickers, schedule rows)
 * medium → "19 Aug 2026"         (dense tables)
 * short  → "19 Aug"              (chips, compact lists)
 */
export function formatDateDisplay(
  iso: string | null | undefined,
  style: DateDisplayStyle = "long",
): string | null {
  const d = parseIsoDate(iso) ?? (iso ? new Date(iso) : null);
  if (!d || Number.isNaN(d.getTime())) return null;

  switch (style) {
    case "short":
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    case "medium":
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    default:
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  }
}

/** `HH:MM` → minutes since midnight, or `null` if unparseable/out of range. */
export function parseHhMm(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = HH_MM_RE.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes since midnight → `HH:MM`. Wraps values outside a single day. */
export function toHhMm(totalMinutes: number): string {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface Time12 {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
}

/** Minutes since midnight → 12-hour parts. */
export function to12Hour(totalMinutes: number): Time12 {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(wrapped / 60);
  return {
    hour12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: wrapped % 60,
    period: h24 < 12 ? "AM" : "PM",
  };
}

/** 12-hour parts → minutes since midnight. */
export function from12Hour(hour12: number, minute: number, period: "AM" | "PM"): number {
  const base = hour12 % 12;
  const h24 = period === "AM" ? base : base + 12;
  return h24 * 60 + minute;
}

/** `HH:MM` (24h) → "9:05 AM" for display. `null` if unparseable. */
export function formatTimeDisplay(value: string | null | undefined): string | null {
  const mins = parseHhMm(value);
  if (mins === null) return null;
  const { hour12, minute, period } = to12Hour(mins);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * How far ahead a session can be scheduled, counted from today.
 *
 * Booking flows pair this with `min={tomorrowDateString()}`, which yields
 * exactly 7 selectable days: tomorrow through today+7.
 */
export const BOOKING_WINDOW_DAYS = 7;

/** The last selectable date for scheduling: today + `BOOKING_WINDOW_DAYS`. */
export function bookingWindowEnd(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + BOOKING_WINDOW_DAYS);
  return toIsoDate(d)!;
}

/* ── Scheduled sessions (IST) ─────────────────────────────────────────────
   The one exception to this module's local-time rule. Scheduled sessions are
   booked against a fixed IST wall clock on the server, so their start instant
   has to be resolved through that offset rather than the viewer's timezone. */

/** India Standard Time is UTC+05:30 — a fixed offset, no DST. */
export const IST_OFFSET_MINUTES = 5 * 60 + 30;

/** Sessions booked without an explicit time start at 09:00 IST. */
export const DEFAULT_SESSION_HOUR_IST = 9;

/**
 * Absolute start instant (epoch ms) of a scheduled session.
 *
 * `date` is a "YYYY-MM-DD" day and `time` an optional "HH:MM" — both expressed
 * in IST, which is why the day is read in UTC terms (so the viewer's timezone
 * cannot shift it) before the offset is subtracted.
 */
export function scheduledSessionStartMs(date: string, time?: string | null): number {
  const d = new Date(date);
  if (isNaN(d.getTime())) return NaN;

  let hours = DEFAULT_SESSION_HOUR_IST;
  let minutes = 0;
  const parts = time?.split(":");
  if (parts?.length === 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      hours = h;
      minutes = m;
    }
  }

  const asIfUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hours, minutes);
  return asIfUtc - IST_OFFSET_MINUTES * 60 * 1000;
}
