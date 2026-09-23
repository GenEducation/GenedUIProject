"use client";

import { useStudentStore } from "@/features/student/store/useStudentStore";
import { usePetStore } from "@/features/student/store/usePetStore";
import { blobatarSeed } from "@/features/student/theme/blobatar";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * The string this student's buddy is generated from.
 *
 * One resolver, because more than one place needs the answer and they must not
 * disagree: `StudentBlobatar` draws the creature, and the tuner draws a grid of
 * *the same creature* in ten silhouettes. Two copies of this logic would drift
 * and the tuner would preview someone else's buddy.
 *
 * Precedence:
 *  1. An explicit override — the onboarding modal passes the name being typed,
 *     so the creature morphs a keystroke at a time before anything is saved.
 *  2. The frozen seed, set when the student saved their name. This is what
 *     stops a later profile rename transforming a buddy they know.
 *  3. Derived live from the current profile, for students who were here before
 *     the seed was frozen. They stay unique and stable unless they rename.
 */
export function useBuddySeed(override?: string): string {
  const studentProfile = useStudentStore((s) => s.studentProfile);
  const petSeed = usePetStore((s) => s.petSeed);

  // `petSeed` is read from localStorage at store init, which the server cannot
  // see. Applying it on the first client render would emit different SVG than
  // the server sent — a hydration mismatch — so it joins in one render later,
  // exactly as `petTraits` does.
  const hydrated = useHydrated();

  if (override !== undefined) return override;
  if (hydrated && petSeed) return petSeed;
  return blobatarSeed(studentProfile);
}
