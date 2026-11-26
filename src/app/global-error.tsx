"use client";

// Root-level error boundary: the only place that can catch an error thrown
// inside the root layout itself (a regular error.tsx can't). Reports to
// Sentry, then shows a branded fallback. The root layout, its fonts and global
// CSS may be what failed, so everything here is inline and self-contained.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ERROR_ART } from "@/features/student/theme/momentArt";

const INK = "#1D6315";
const PRIMARY = "#287624";
const PAPER = "#FBF9F2";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: PAPER, fontFamily: "ui-rounded, 'Segoe UI', sans-serif" }}>
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            textAlign: "center",
            color: INK,
          }}
        >
          {/* A house of cards, one card slipped out. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- the root layout may be broken; keep this plain. */}
          <img src={ERROR_ART.src} alt="" aria-hidden="true" width={330} height={220} style={{ maxWidth: "100%", height: "auto" }} />
          <h1 style={{ margin: "16px 0 0", fontSize: 26, fontWeight: 800 }}>Something slipped</h1>
          <p style={{ margin: "8px 0 0", maxWidth: "38ch", fontSize: 15, lineHeight: 1.6, opacity: 0.7 }}>
            Zoovi hit a problem loading this page. Give it another try. Your progress is safe.
          </p>
          {/* eslint-disable-next-line no-restricted-syntax -- the shared <Button> needs the app's tokens, which may be what failed. */}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              border: 0,
              borderRadius: 999,
              padding: "10px 20px",
              background: PRIMARY,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
