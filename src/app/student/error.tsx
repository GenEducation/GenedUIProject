"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/Button";
import { MomentPage } from "@/components/shared/MomentPage";
import { ERROR_ART } from "@/features/student/theme/momentArt";

/** A student route crashed: a house of cards, one card slipped out. Try again, or go home. */
export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <MomentPage
      art={ERROR_ART}
      title="Something slipped"
      body="One piece of this page didn’t load. Give it another try. Your progress is safe."
    >
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
      <Link href="/student" className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]">
        Back to home
      </Link>
    </MomentPage>
  );
}
