/**
 * Pure calculations behind the parent Home page: the study-time period
 * options, gap-filled activity series, session trend and chapter progress.
 */
import type { StudyTimePoint } from "../services/parentService";

export type PeriodKey = "7d" | "30d" | "90d" | "all";

export interface PeriodOption {
  value: PeriodKey;
  label: string;
  /** Days covered, or null for all time. */
  days: number | null;
  granularity: "day" | "week";
  /** Chart caption. */
  caption: string;
}

export const PERIODS: PeriodOption[] = [
  { value: "7d", label: "Last 7 Days", days: 7, granularity: "day", caption: "Daily study minutes — last 7 days" },
  { value: "30d", label: "Last 30 Days", days: 30, granularity: "day", caption: "Daily study minutes — last 30 days" },
  { value: "90d", label: "Last 90 Days", days: 90, granularity: "day", caption: "Daily study minutes — last 90 days" },
  { value: "all", label: "All Time", days: null, granularity: "week", caption: "Weekly study minutes — all time" },
];

export const DEFAULT_PERIOD: PeriodKey = "30d";

export function periodOption(key: PeriodKey): PeriodOption {
  return PERIODS.find((p) => p.value === key) ?? PERIODS[1];
}

export interface ActivityPoint {
  /** The API's period key ("2026-09-19"; a week start for weekly data). */
  period: string;
  minutes: number;
}

/** "2026-09-19" in local time, to line up with the API's day keys. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The last `days` days ending today, one point per day, with days the API
 * didn't report (no study) as zero.
 */
export function fillDailySeries(points: StudyTimePoint[], days: number, today: Date = new Date()): ActivityPoint[] {
  const byDay = new Map<string, number>();
  for (const p of points) byDay.set(p.period.slice(0, 10), (byDay.get(p.period.slice(0, 10)) ?? 0) + p.total_minutes);

  const series: ActivityPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = localDayKey(day);
    series.push({ period: key, minutes: Math.round(byDay.get(key) ?? 0) });
  }
  return series;
}

/** Weekly (all-time) points as the API returned them, oldest first. */
export function weeklySeries(points: StudyTimePoint[]): ActivityPoint[] {
  return points.map((p) => ({ period: p.period, minutes: Math.round(p.total_minutes) }));
}

export function totalMinutes(series: ActivityPoint[]): number {
  return series.reduce((sum, p) => sum + p.minutes, 0);
}

/** 2550 → "42h 30m"; 45 → "45m"; 120 → "2h 0m". */
export function formatDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "2026-09-19" → "19 Sept"; anything unparseable is returned as-is. */
export function formatPeriodLabel(period: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(period);
  if (!match) return period;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return SHORT_DATE.format(date);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Percentage change in sessions started over the last 30 days against the 30
 * before. Null when there's nothing to compare against.
 */
export function sessionTrendPct(startedAt: string[], now: number = Date.now()): number | null {
  let recent = 0;
  let previous = 0;
  for (const iso of startedAt) {
    const age = now - Date.parse(iso);
    if (age < 0 || Number.isNaN(age)) continue;
    if (age < 30 * DAY_MS) recent++;
    else if (age < 60 * DAY_MS) previous++;
  }
  if (previous === 0) return null;
  return Math.round(((recent - previous) / previous) * 100);
}

interface ChapterRow {
  completion_percentage?: number;
  is_placeholder?: boolean;
}

/** Chapters the child has started, out of the subject's real chapters. */
export function chapterProgress(rows: ChapterRow[]): { started: number; total: number } {
  const real = rows.filter((r) => !r.is_placeholder);
  return {
    started: real.filter((r) => (r.completion_percentage ?? 0) > 0).length,
    total: real.length,
  };
}

/** Study minutes per subject from the per-chapter breakdown. */
export function minutesBySubject(rows: { subject: string; total_minutes: number }[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const r of rows) totals[r.subject] = (totals[r.subject] ?? 0) + r.total_minutes;
  return totals;
}

/** "Good morning" / "Good afternoon" / "Good evening" by local hour. */
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
