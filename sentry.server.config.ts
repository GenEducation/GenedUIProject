// Server-side Sentry init — imported conditionally by src/instrumentation.ts.
// See docs/observability/frontend-instrumentation-spec.md (backend repo).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,
  // Errors only by default — traces are expensive and the backend already
  // has distributed tracing (Cloud Trace) for the request path once it
  // crosses the gateway. Revisit if server-side Next.js route handlers need
  // their own tracing independent of the backend.
  tracesSampleRate: 0,
  debug: false,
});
