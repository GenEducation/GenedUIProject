/**
 * Per-parent memory of when each child was last viewed, kept in this browser.
 * It drives two things on the student switcher: which child "Switch" returns
 * to (the most recently viewed other child), and the "new activity" dot (the
 * child did something after the parent last looked).
 */

export type SeenMap = Record<string, number>;

const storageKey = (parentId: string) => `gened_parent_seen_students:${parentId}`;

// A child the parent has never opened here counts as last seen this long ago,
// so recent work still gets flagged without lighting up years of history.
export const UNSEEN_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export function readSeen(parentId: string): SeenMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(parentId)) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const seen: SeenMap = {};
    for (const [id, at] of Object.entries(parsed)) {
      if (typeof at === "number" && Number.isFinite(at)) seen[id] = at;
    }
    return seen;
  } catch {
    return {};
  }
}

export function markSeen(parentId: string, studentId: string, at: number = Date.now()): SeenMap {
  const seen = { ...readSeen(parentId), [studentId]: at };
  try {
    localStorage.setItem(storageKey(parentId), JSON.stringify(seen));
  } catch {
    // Private mode / blocked storage: recency still works for this session.
  }
  return seen;
}

export function hasNewActivity(
  lastActivity: string | null | undefined,
  lastSeen: number | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastActivity) return false;
  const at = Date.parse(lastActivity);
  if (Number.isNaN(at)) return false;
  return at > (lastSeen ?? now - UNSEEN_LOOKBACK_MS);
}

export function describeLastSeen(lastSeen: number | undefined, now: number = Date.now()): string {
  if (lastSeen === undefined) return "Not viewed yet";
  const minutes = Math.floor((now - lastSeen) / 60_000);
  if (minutes < 1) return "Viewed just now";
  if (minutes < 60) return `Viewed ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Viewed ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Viewed yesterday" : `Viewed ${days}d ago`;
}
