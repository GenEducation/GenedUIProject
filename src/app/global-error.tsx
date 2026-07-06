"use client";

// Root-level error boundary — the only place that can catch an error thrown
// inside the root layout itself (a regular error.tsx can't). Reports to
// Sentry, then falls back to Next.js's default error UI.
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* NextError is the default Next.js error page component */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
