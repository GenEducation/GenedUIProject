"use client";

import { useEffect, useState } from "react";
import type { PartnerBook } from "../types/sources";
import { sourcesService } from "../services/sourcesService";

/**
 * The books this partner filed chapters under, for the upload form's book
 * picker, narrowed to the subject and grade the form has picked (all of them
 * until one is). Reloads when either changes. A failure leaves the list empty:
 * the book field is then a plain text box, which always works. `enabled`
 * false (a closed form) asks nothing.
 */
export function usePartnerBooks(
  subject: string,
  grade: number | null,
  enabled = true,
): PartnerBook[] {
  const [books, setBooks] = useState<PartnerBook[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    sourcesService
      .books({ subject: subject || undefined, grade: grade ?? undefined })
      .then((found) => {
        if (live) setBooks(found);
      })
      .catch(() => {
        if (live) setBooks([]);
      });
    return () => {
      live = false;
    };
  }, [subject, grade, enabled]);

  return enabled ? books : [];
}
