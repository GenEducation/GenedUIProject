/**
 * Portal sections switched off for now. Turning one off hides its nav links
 * and blocks its URLs (they redirect home), in both the student and parent
 * portals. Flip back to `true` to bring a section back.
 */
export const FEATURES = {
  /** Student "Practice" (/student/assessments). */
  practice: false,
  /** Student schedule (/student/schedule), the parent schedule view
   *  (/parent/:id/schedule) and the upcoming-session panel on student home. */
  schedule: false,
} as const;
