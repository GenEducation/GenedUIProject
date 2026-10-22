/** New-account sign-up is paused; flip to `true` to restore /register and its links. */
export const SIGNUP_ENABLED = false;

/**
 * Portal sections switched off for now. Turning one off hides its nav links
 * and blocks its URLs (they redirect home), in both the student and parent
 * portals. Flip back to `true` to bring a section back.
 */
export const FEATURES = {
  /** Student "Practice" (/student/practice). */
  practice: false,
  /** Student schedule (/student/schedule), the parent schedule view
   *  (/parent/:id/schedule) and the upcoming-session panel on student home. */
  schedule: false,
  /** Streak / session stats (`GET /students/{id}/streak`), served from the learning activity model
   *  (backend `docs/specs/LEARNING_ACTIVITY_v1.md`): days with a counted action or credited presence, and ended sessions. */
  streak: true,
  /** Study time per chapter (`GET /students/{id}/time/by-chapter`), behind student home's Time Spent, the report
   *  card's chapter times and the parent home's per-subject study time. The time is an estimate of credited presence
   *  and is shown as one. */
  chapterTime: true,
} as const;
