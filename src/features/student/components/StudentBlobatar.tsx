"use client";

import React from "react";
import { Blobatar } from "@blobatar/react";
import type { Expression } from "blobatar";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { usePetStore } from "@/features/student/store/usePetStore";
import { getStudentDisplayName } from "@/features/student/utils/displayName";
import { resolveTraits } from "@/features/student/theme/blobatar";
import { useBuddySeed } from "@/features/student/hooks/useBuddySeed";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * The student's buddy — the creature, wherever it appears.
 *
 * **Not a profile picture.** That is `StudentAvatarIllustration` and the
 * `graduate-*` assets, chosen via `AvatarPickerModal` and shown on the sidebar
 * chip, the chat header and the profile hero. This is the companion: the desk
 * pet, and the three places it reacts to something (onboarding, test results,
 * the placement test).
 *
 * The seed is `user_id`, so a student's buddy is the same creature every time
 * they see it, and no two students share one.
 *
 * Two rendering modes, and the choice is not cosmetic: a static blobatar is a
 * single `<img>`, an animated one is inline SVG at roughly a dozen DOM nodes.
 * That is why `animate` is opt-in per call site rather than a default — a list
 * of avatars wants the `<img>`.
 */

interface StudentBlobatarProps {
  size: number;
  /** Inline SVG + idle motion. Omit for the single-`<img>` static default. */
  animate?: "hover" | "always";
  expression?: Expression;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Cursor-tracking ref from `useGaze()`. Only meaningful alongside `animate`,
   * and only worth it at large sizes — the excursion is a fraction of a pixel
   * on a 34px sidebar chip.
   */
  gazeRef?: (node: SVGSVGElement | HTMLImageElement | null) => void;
  /**
   * Draw the creature for this seed instead of the student's own.
   *
   * Onboarding passes the name as it is typed, so the buddy visibly changes
   * before anything has been saved. Everywhere else omits it.
   */
  seed?: string;
}

export function StudentBlobatar({
  size,
  animate,
  expression,
  className,
  style,
  gazeRef,
  seed: seedOverride,
}: StudentBlobatarProps) {
  const studentProfile = useStudentStore((s) => s.studentProfile);
  const petTraits = usePetStore((s) => s.petTraits);

  const seed = useBuddySeed(seedOverride);
  // `petTraits` is read from localStorage when the store initializes, which
  // the server cannot see. Applying it on the first client render would emit
  // different SVG than the server sent — a hydration mismatch — so a
  // customized creature appears one render later instead.
  const hydrated = useHydrated();
  const traits = resolveTraits(hydrated ? petTraits : null);
  // Names the creature for assistive tech. Expressions deliberately do not
  // reach AT — a pose is decoration, and whatever it reflects (the tutor
  // responding, a test being graded) is announced by real DOM elsewhere.
  const title = getStudentDisplayName(studentProfile);

  // The prop union is discriminated on `animate`: the static branch takes
  // <img> attributes, the animated branch takes <svg> ones. Passing
  // `animate={undefined}` into the animated branch does not type-check, so the
  // two cases are spelled out rather than spread.
  if (animate) {
    return (
      <Blobatar
        ref={gazeRef}
        name={seed}
        size={size}
        traits={traits}
        animate={animate}
        expression={expression}
        title={title}
        className={className}
        style={style}
      />
    );
  }

  return (
    <Blobatar
      name={seed}
      size={size}
      traits={traits}
      expression={expression}
      title={title}
      className={className}
      style={style}
    />
  );
}
