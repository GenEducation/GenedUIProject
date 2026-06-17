export const SUBJECTS = ["English", "Mathematics", "Science", "Hindi"] as const;

export const SUBJECT_COLORS: Record<string, string> = {
  English: "#74B9FF",
  Mathematics: "#00B894",
  Science: "#FDCB6E",
  Hindi: "#6C5CE7",
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
