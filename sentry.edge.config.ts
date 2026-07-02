// Edge runtime Sentry init (middleware.ts, edge API routes) — imported
// conditionally by src/instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: 0,
  debug: false,
});
