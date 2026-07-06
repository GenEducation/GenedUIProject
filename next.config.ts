import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// No-op (returns nextConfig unchanged) when SENTRY_ORG/SENTRY_PROJECT aren't
// set — source-map upload needs a Sentry auth token this repo doesn't have;
// error reporting itself only needs NEXT_PUBLIC_SENTRY_DSN (see
// src/instrumentation-client.ts) and works without this wrapper's extras.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
