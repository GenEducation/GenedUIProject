import { authFetch } from "@/utils/authFetch";
import type { ReportWho } from "../v1Report";

/**
 * The report card's date-ranged and listed sections, each its own read so one failing never blanks the card
 * (backend `contracts/openapi/api.json`):
 *
 *   GET /v1/learner/activity?from=&granularity=day      answers, right answers, estimated minutes per day
 *   GET /v1/learner/trends?weeks=12                     week by week, the share of answered skills known
 *   GET /v1/learner/misconceptions                      the wrong ideas answers showed, open or resolved
 *   GET /students/{id}/streak                           current and longest streak
 *   GET /v1/learner/insights, POST .../insights/refresh the written note (and the reload button)
 *
 * A parent reads the same bodies from `/v1/parent/children/{id}/...` (an APPROVED link only).
 */

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** The calendar covers this many days, today included; the header's study time is its last `STUDY_TIME_DAYS`. */
export const CALENDAR_DAYS = 84;
export const STUDY_TIME_DAYS = 30;
export const TREND_WEEKS = 12;

export interface ActivityPeriod {
  /** The period's first local date, `YYYY-MM-DD`. */
  period: string;
  answers: number;
  correct: number;
  /** Estimated presence, in minutes. */
  minutes: number;
  /** Days of the period that count as active: 0 or 1 for a day. */
  active_days: number;
  skills_levelled_up: number | null;
}

export interface ActivitySeries {
  start: string;
  end: string;
  measurement: string;
  /** The first date presence was measured; time before it was never measured, it is not zero. */
  measured_since: string | null;
  periods: ActivityPeriod[];
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
}

export interface ActivityData {
  series: ActivitySeries;
  streak: Streak | null;
}

export interface TrendPoint {
  week: string;
  /** 0 to 1; null when no skill is measured yet. */
  known_share: number | null;
  measured: number;
  known: number;
  levelled_up: number;
}

export interface Trends {
  weeks: string[];
  overall: TrendPoint[];
  subjects: Array<{ subject_code: string; points: TrendPoint[] }>;
}

export interface Misconception {
  misconception_id: string;
  title: string;
  chapter_id: string;
  chapter_title: string;
  subject_code: string;
  first_seen_at: string;
  last_seen_at: string;
  times_seen: number;
  resolved: boolean;
}

export type InsightSignal = "positive" | "concern" | "neutral";

/** One measured thing an insight's sentence rests on (`kind` and `unit` are closed sets; the card words them). */
export interface InsightFact {
  id: string;
  kind: string;
  subject_code: string | null;
  label: string | null;
  value: number;
  of: number | null;
  unit: string;
  signal: InsightSignal;
}

export interface InsightItem {
  text: string;
  evidence: string[];
}

export interface InsightView {
  generated_at: string;
  headline: string;
  /** The facts the headline rests on. */
  headline_evidence: string[];
  working_well: InsightItem[];
  needs_attention: InsightItem[];
  next_steps: Array<InsightItem & { kind: string }>;
  subjects: Array<{ subject_code: string; headline: string; working_well: InsightItem[]; needs_attention: InsightItem[] }>;
  /** Only the facts the sentences cite. */
  facts: InsightFact[];
}

export interface InsightsResponse {
  /** `none`: not enough answers yet; `unavailable`: the last attempt failed and nothing is stored; `disabled`: off. */
  status: "ready" | "none" | "unavailable" | "disabled";
  /** A newer note is being written; the one shown (if any) is the previous. */
  refreshing: boolean;
  can_reload: boolean;
  insight: InsightView | null;
}

/** How often, and how many times, to read again while a note is being written (a test shortens the wait). */
export const INSIGHT_POLLING = { ms: 3000, max: 20 };

async function getJson<T>(path: string, who: ReportWho): Promise<T> {
  const response = await authFetch(`${API}${path}`, { headers: { accept: "application/json" }, allow403: who.role === "parent" });
  return response.json() as Promise<T>;
}

const base = (who: ReportWho) => (who.role === "parent" ? `/v1/parent/children/${encodeURIComponent(who.childId)}` : "/v1/learner");
const dateOnly = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function loadActivity(who: ReportWho, now = new Date()): Promise<ActivityData> {
  const from = new Date(now);
  from.setDate(from.getDate() - (CALENDAR_DAYS - 1));
  const studentId = who.role === "parent" ? who.childId : who.studentId;
  const [series, streak] = await Promise.all([
    getJson<ActivitySeries>(`${base(who)}/activity?from=${dateOnly(from)}&granularity=day`, who),
    // The streak is a nicety on top of the calendar: without it the calendar still stands.
    studentId
      ? getJson<Streak>(`/students/${encodeURIComponent(studentId)}/streak`, who).catch(() => null)
      : Promise.resolve(null),
  ]);
  return { series, streak };
}

export const loadTrends = (who: ReportWho) => getJson<Trends>(`${base(who)}/trends?weeks=${TREND_WEEKS}`, who);

export const loadMisconceptions = async (who: ReportWho): Promise<Misconception[]> =>
  (await getJson<{ misconceptions: Misconception[] }>(`${base(who)}/misconceptions`, who)).misconceptions;

export const loadInsights = (who: ReportWho) => getJson<InsightsResponse>(`${base(who)}/insights`, who);

/** The reload button (a student's own; the backend refuses anyone else). */
export async function refreshInsights(): Promise<InsightsResponse> {
  const response = await authFetch(`${API}/v1/learner/insights/refresh`, { method: "POST", headers: { accept: "application/json" } });
  return response.json() as Promise<InsightsResponse>;
}

/** An evidence fact in words, for the chip beside the sentence it supports. */
export function factText(f: InsightFact): string {
  const name = f.label ?? "";
  const of = f.of ?? 0;
  switch (f.kind) {
    case "skills_known": return `${name}: ${f.value} of ${of} skills known`;
    case "mastery": return `${name}: ${f.value}% mastery`;
    case "weekly_trend": return `${name}: ${f.value > 0 ? "+" : ""}${f.value} points over ${of} weeks`;
    case "levelled_up": return `${f.value} ${f.value === 1 ? "skill" : "skills"} moved up in ${of} weeks`;
    case "keep_practising": return `To revisit: ${name}`;
    case "needs_adult_help": return `An adult's help: ${name}`;
    case "misconception_open": return `${name}: seen ${f.value} ${f.value === 1 ? "time" : "times"}`;
    case "misconception_fixed": return `Cleared: ${name}`;
    case "answers_alone_share": return `${f.value}% of ${of} right answers on their own`;
    case "active_days": return `${f.value} of ${of} days active`;
    case "study_minutes": return `About ${f.value} min in ${of} days`;
    case "streak": return `${f.value}-day streak`;
    case "chapters_completed": return `${name}: ${f.value} of ${of} chapters done`;
    default: return name || `${f.value}`;
  }
}

/** Estimated minutes over the last `days` periods of a day series, and whether the series starts before the first
 *  measured date (so the figure covers less than the window says). */
export function recentMinutes(series: ActivitySeries, days = STUDY_TIME_DAYS): { minutes: number; partial: boolean } {
  const last = series.periods.slice(-days);
  const minutes = last.reduce((sum, p) => sum + p.minutes, 0);
  const partial = series.measured_since != null && last.length > 0 && series.measured_since > last[0].period;
  return { minutes, partial };
}

/** A trend's points as 0 to 100 values, skipping weeks where nothing was measured yet. */
export function trendLine(points: TrendPoint[]): { values: number[]; delta: number } | null {
  const values = points.filter((p) => p.known_share != null).map((p) => Math.round((p.known_share as number) * 100));
  return values.length < 2 ? null : { values, delta: values[values.length - 1] - values[0] };
}
