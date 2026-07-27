/**
 * Shared student display-name resolver.
 *
 * Surfaces used to each re-derive the name inline with different fallback
 * chains — some read `name || username`, some read `username` only — which
 * is why the same child could show up differently across screens. Route
 * every surface through this instead.
 */

/** Capitalize the first letter of each word (utkarsh → Utkarsh). */
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve a student's display name: prefer their real `name`, fall back to the
 * login `username`, then a generic "Student". The result is title-cased for
 * display; the stored value is never mutated.
 */
export function getStudentDisplayName(
  profile?: { name?: string | null; username?: string | null } | null
): string {
  const raw = profile?.name?.trim() || profile?.username || "Student";
  return titleCase(raw);
}
