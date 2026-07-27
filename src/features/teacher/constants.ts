// Brand-harmonized palette (navy/emerald family) — replaces the earlier Flat-UI
// colors which clashed with the portal's navy/emerald identity.
export const SUBJECT_COLORS: Record<string, string> = {
  English: "#4A6FA5", // slate blue
  Mathematics: "#059F6D", // emerald
  Science: "#B98A2E", // muted gold
  "Social Science": "#B0543F",
  History: "#A6762D",
  Geography: "#1E8FA6",
  "Social & Political Science": "#8C4A6B",
};

export function subjectColor(subject?: string | null): string {
  if (!subject) return "#94a3b8";
  return SUBJECT_COLORS[subject] || "#94a3b8";
}
