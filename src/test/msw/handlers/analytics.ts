import { http, HttpResponse } from "msw";

import {
  activationPanelFixture,
  activationSeriesFixture,
  diagnosticsFixture,
  dimsValuesFixture,
  funnelFixture,
  journeySummaryFixture,
  metaFixture,
  onboardingPanelFixture,
  placementPanelFixture,
} from "@/test/fixtures/learningSignal";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const ANALYTICS = `${BASE}/admin/analytics`;

/**
 * The rollup job has never run against real data, so these handlers are the
 * only way to see the dashboard fully populated. They serve the abnormal-state
 * fixtures too — suppressed, low-confidence, stale, parked, immature — because
 * those are the states most likely to be rendered wrongly.
 */
export const analyticsHandlers = [
  http.get(`${ANALYTICS}/meta`, () => HttpResponse.json(metaFixture)),

  http.get(`${ANALYTICS}/dims/values`, () => HttpResponse.json(dimsValuesFixture)),

  http.get(`${ANALYTICS}/panels/journey-summary`, () =>
    HttpResponse.json(journeySummaryFixture),
  ),

  http.get(`${ANALYTICS}/funnel`, () => HttpResponse.json(funnelFixture)),

  http.get(`${ANALYTICS}/panels/:panel`, ({ params }) => {
    switch (params.panel) {
      case "onboarding":
        return HttpResponse.json(onboardingPanelFixture);
      case "placement":
        return HttpResponse.json(placementPanelFixture);
      case "activation":
        return HttpResponse.json(activationPanelFixture);
      default:
        return HttpResponse.json([]);
    }
  }),

  http.get(`${ANALYTICS}/metrics/:metricId/series`, ({ params }) => {
    const id = String(params.metricId);
    if (id === "ACT-01" || id === "ACT-02") {
      return HttpResponse.json(activationSeriesFixture(id));
    }
    if (!metaFixture.some((m) => m.metric_id === id)) {
      return HttpResponse.json({ detail: "Unknown metric" }, { status: 404 });
    }
    return HttpResponse.json([]);
  }),

  http.get(`${ANALYTICS}/diagnostics/:diagnosticId`, ({ params }) =>
    HttpResponse.json(params.diagnosticId === "PLC-06" ? diagnosticsFixture : []),
  ),
];

/** Every endpoint empty — the real state of the backend until the first rollup. */
export const emptyAnalyticsHandlers = [
  http.get(`${ANALYTICS}/meta`, () => HttpResponse.json(metaFixture)),
  http.get(`${ANALYTICS}/dims/values`, () => HttpResponse.json(dimsValuesFixture)),
  http.get(`${ANALYTICS}/panels/journey-summary`, () =>
    HttpResponse.json({
      range: "28d",
      as_of: new Date().toISOString(),
      steps: [],
      partial_cohorts: 0,
      previous_partial_cohorts: 0,
    }),
  ),
  http.get(`${ANALYTICS}/funnel`, () => HttpResponse.json([])),
  http.get(`${ANALYTICS}/panels/:panel`, () => HttpResponse.json([])),
  http.get(`${ANALYTICS}/metrics/:metricId/series`, () => HttpResponse.json([])),
  http.get(`${ANALYTICS}/diagnostics/:diagnosticId`, () => HttpResponse.json([])),
];
