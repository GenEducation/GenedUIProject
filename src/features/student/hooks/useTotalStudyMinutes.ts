"use client";

import { useEffect, useState } from "react";
import { studentService } from "@/features/student/services/studentService";

/**
 * Total minutes the student has spent learning, summed from
 * `/students/{id}/time/by-chapter` — the same per-chapter minutes the report
 * card shows per chapter and the parent home totals per subject, so all three
 * agree.
 *
 * `undefined` while loading, `null` if it could not be loaded.
 */
export function useTotalStudyMinutes(studentId: string | undefined): number | null | undefined {
  const [minutes, setMinutes] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setMinutes(undefined);
    studentService
      .fetchTimeByChapter(studentId)
      .then((rows: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(rows)) {
          setMinutes(null);
          return;
        }
        const total = rows.reduce(
          (sum: number, r: { total_minutes?: unknown }) => sum + (Number(r?.total_minutes) || 0),
          0,
        );
        setMinutes(total);
      })
      .catch((err) => {
        console.warn("[Home] Could not load study time:", err);
        if (!cancelled) setMinutes(null);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return minutes;
}
