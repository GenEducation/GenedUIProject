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
/**
 * Placement is served by the MVP onboarding service. Against a backend without it (the
 * new gened stack run locally), every student page opens a "couldn't load your test"
 * dialog, so it can be switched off with NEXT_PUBLIC_PLACEMENT_ENABLED=false. On by default.
 */
const PLACEMENT_ENABLED = process.env.NEXT_PUBLIC_PLACEMENT_ENABLED !== "false";

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
    if (!PLACEMENT_ENABLED || !studentId || !hasName) return;
    if (checkedFor.current === studentId) return;
    checkedFor.current = studentId;
    void checkStatus(studentId);
  }, [studentId, hasName, checkStatus]);

  if (!PLACEMENT_ENABLED || !studentId || !hasName) return null;

  return <PlacementBoard studentId={studentId} subjects={subjects} />;
}
