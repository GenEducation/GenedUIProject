"use client";

import { useEffect, useRef } from "react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { usePlacementStore } from "../store/usePlacementStore";
import { PlacementBoard } from "./PlacementBoard";

/**
 * Decides whether a student is routed into the placement form, and mounts it.
 *
 * Mounted once in the student layout — the form outlives any single page, and
 * a student who navigates mid-attempt should not lose it.
 *
 * Order matters here. `CompleteProfileBanner` owns the screen while the
 * profile has no name: that banner is where the student sets their own name
 * and names their AI companion, which is the bank's opening "naming step".
 * Those two values belong to auth-service (`students.name` / `students.ai_name`)
 * and are not part of the placement API at all, so there is no naming UI in
 * this feature and nothing to send.
 *
 * The status call runs once per mount. Everything else the store decides:
 * COMPLETED and ONBD_1104 (ICSE, or a grade outside 3–9) both resolve to
 * "render nothing, quietly".
 */
export function PlacementGate() {
  const studentProfile = useStudentStore((s) => s.studentProfile);
  const checkStatus = usePlacementStore((s) => s.checkStatus);
  const subjects = usePlacementStore((s) => s.subjects);

  // One check per mount. Without this, closing the form would drop the store
  // back to "idle" and the effect would immediately reopen it.
  const checkedFor = useRef<string | null>(null);

  const studentId = studentProfile?.user_id;
  const hasName = Boolean(studentProfile?.name);

  useEffect(() => {
    if (!studentId || !hasName) return;
    if (checkedFor.current === studentId) return;
    checkedFor.current = studentId;
    void checkStatus(studentId);
  }, [studentId, hasName, checkStatus]);

  if (!studentId || !hasName) return null;

  return <PlacementBoard studentId={studentId} subjects={subjects} />;
}
