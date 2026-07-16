/**
 * Client-side Sentry init — Next.js App Router convention (auto-loaded,
 * replaces the older sentry.client.config.ts pattern which doesn't work
 * reliably under Turbopack).
 *
 * No-op with no DSN configured (NEXT_PUBLIC_SENTRY_DSN unset) — safe default
 * for local dev / CI, matches the backend's initialize_gcp_tracer() pattern
 * of "activate only when configured, never crash startup."
 *
 * Covers Phase 4 of the observability roadmap (see docs/observability/
 * frontend-instrumentation-spec.md in the backend repo):
 *   - JS errors + stack traces (automatic)
 *   - Core Web Vitals — LCP/INP/CLS (via browserTracingIntegration)
 *   - Navigation failures / route errors (automatic, App Router aware)
 *   - Release tracking (NEXT_PUBLIC_RELEASE, set at build time)
 * SSE-specific TTFT/cancellation and the onboarding-gate funnel are
 * instrumented at their call sites (see studentService.ts / SchedulePage.tsx
 * equivalents) via Sentry.addBreadcrumb + custom spans, not here.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_RELEASE,

  // Sampled, not 100% — matches the backend's cost-conscious sampling
  // approach (LogSamplingFilter). Revisit once real traffic volume is known.
  tracesSampleRate: 0.1,

  // Session Replay — record a DOM replay so we can *watch* what a user did
  // before an error. Sample lightly for normal sessions but always keep a
  // replay when an error fires (highest-value case). Privacy masking is on by
  // default (maskAllText/blockAllMedia) — required since this is a K-12
  // product carrying student PII.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
