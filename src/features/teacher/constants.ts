export const SUBJECTS = ["English", "Mathematics", "Science", "Hindi"] as const;

// Brand-harmonized palette (navy/emerald family) — replaces the earlier Flat-UI
// colors which clashed with the portal's navy/emerald identity.
export const SUBJECT_COLORS: Record<string, string> = {
  English: "#4A6FA5", // slate blue
  Mathematics: "#059F6D", // emerald
  Science: "#B98A2E", // muted gold
  Hindi: "#2E8C8C", // muted teal
};

export function subjectColor(subject?: string | null): string {
  if (!subject) return "#94a3b8";
  return SUBJECT_COLORS[normalizeSubject(subject)] || SUBJECT_COLORS[subject] || "#94a3b8";
}

/** Map a possibly differently-cased/abbreviated subject string to its canonical name. */
export function normalizeSubject(subject?: string | null): string {
  if (!subject) return "";
  const match = SUBJECTS.find((s) => s.toLowerCase() === subject.toLowerCase());
  return match || subject;
}
