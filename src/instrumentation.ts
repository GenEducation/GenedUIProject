/**
 * Server + edge runtime Sentry init (Next.js App Router convention — this
 * file is auto-loaded by Next.js before any server code runs). Client-side
 * init lives in instrumentation-client.ts (separate file, separate runtime).
 *
 * No-op with no DSN set (dev/CI default) — see docs/observability/
 * frontend-instrumentation-spec.md in the backend repo for what this feeds.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (
  ...args: Parameters<NonNullable<typeof import("@sentry/nextjs").captureRequestError>>
) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
