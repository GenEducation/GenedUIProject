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
  // Pin the uploaded source-map bundle to the same release id the browser SDK
  // reports at runtime (NEXT_PUBLIC_RELEASE, set per-deploy in Vercel; falls
  // back to the Vercel-provided git SHA). Without this, maps and events can be
  // filed under different release ids and fail to symbolicate.
  release: {
    name: process.env.NEXT_PUBLIC_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  },
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
