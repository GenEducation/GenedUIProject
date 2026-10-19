import { authFetch } from "@/utils/authFetch";

import type {
  DiagnosticRow,
  DimsValues,
  FunnelRow,
  JourneySummary,
  MetricMeta,
  MetricRow,
  PanelName,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const BASE = "/admin/analytics";

async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(`${API_BASE_URL}${path}`);
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/**
 * The metric catalogue. Cached for the lifetime of the page: it only changes
 * when the registry is reseeded, and every panel needs it to know which of its
 * metrics are parked rather than broken.
 */
let metaPromise: Promise<MetricMeta[]> | null = null;

export function getAnalyticsMeta(): Promise<MetricMeta[]> {
  metaPromise ??= getJson<MetricMeta[]>(`${BASE}/meta`).catch((e) => {
    // Don't poison the cache — a transient failure shouldn't leave every
    // subsequent panel permanently unable to tell ACTIVE from NOT_INSTRUMENTED.
    metaPromise = null;
    throw e;
  });
  return metaPromise;
}

/** Test seam. */
export function resetAnalyticsMetaCache(): void {
  metaPromise = null;
}

/**
 * Board/grade options for the filter dropdowns. Static server-side, so it is
 * cached alongside `/meta` rather than refetched on every poll.
 */
export function getDimsValues(): Promise<DimsValues> {
  return getJson<DimsValues>(`${BASE}/dims/values`);
}

export function getJourneySummary(range = "28d", comparePrevious = true): Promise<JourneySummary> {
  return getJson<JourneySummary>(
    `${BASE}/panels/journey-summary${qs({ range, compare_previous: String(comparePrevious) })}`,
  );
}

export function getFunnel(opts: {
  range?: string;
  board?: string;
  grade?: number | string;
} = {}): Promise<FunnelRow[]> {
  const { range = "28d", board, grade } = opts;
  return getJson<FunnelRow[]>(`${BASE}/funnel${qs({ range, board, grade })}`);
}

export function getPanel(panel: PanelName, range = "28d"): Promise<MetricRow[]> {
  return getJson<MetricRow[]>(`${BASE}/panels/${panel}${qs({ range })}`);
}

export function getMetricSeries(
  metricId: string,
  opts: { from: string; to: string; dims?: string; definitionVersion?: number },
): Promise<MetricRow[]> {
  const { from, to, dims, definitionVersion } = opts;
  return getJson<MetricRow[]>(
    `${BASE}/metrics/${encodeURIComponent(metricId)}/series${qs({
      from,
      to,
      dims,
      definition_version: definitionVersion,
    })}`,
  );
}

export function getDiagnostic(
  diagnosticId: string,
  opts: { range?: string; dims?: string; limit?: number } = {},
): Promise<DiagnosticRow[]> {
  const { range = "7d", dims, limit = 50 } = opts;
  return getJson<DiagnosticRow[]>(
    `${BASE}/diagnostics/${encodeURIComponent(diagnosticId)}${qs({ range, dims, limit })}`,
  );
}
