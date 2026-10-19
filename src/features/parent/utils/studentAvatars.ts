import { STUDENT_AVATAR_IDS, studentAvatarSrc } from "@/constants/studentAvatars";

/**
 * Illustrated profile icons for a parent's linked children.
 *
 * The student record has no gender (or any appearance) field, so each child is
 * given an icon derived from their student_id. The mapping is deterministic —
 * the same child keeps the same face across reloads, the portal picker and the
 * sidebar — and siblings never share an icon while there are icons to spare.
 */
export const STUDENT_AVATARS = STUDENT_AVATAR_IDS.map(studentAvatarSrc);

/** djb2 string hash, kept unsigned so the modulo is always a valid index. */
function hashId(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Map each student_id to an icon path. IDs are resolved in sorted order so the
 * result doesn't depend on the order the API returned them in; a collision
 * walks forward to the next free icon.
 */
export function assignStudentAvatars(studentIds: string[]): Record<string, string> {
  const assigned: Record<string, string> = {};
  const used = new Set<number>();

  for (const id of [...new Set(studentIds)].sort()) {
    let index = hashId(id) % STUDENT_AVATARS.length;
    if (used.size < STUDENT_AVATARS.length) {
      while (used.has(index)) index = (index + 1) % STUDENT_AVATARS.length;
    }
    used.add(index);
    assigned[id] = STUDENT_AVATARS[index];
  }

  return assigned;
}
