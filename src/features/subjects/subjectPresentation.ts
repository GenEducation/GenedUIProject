import { createElement, type ComponentType, type CSSProperties } from "react";
import { BookOpen } from "lucide-react";

import { EnglishIcon } from "@/components/icons/EnglishIcon";
import { GeographyIcon } from "@/components/icons/GeographyIcon";
import { HistoryIcon } from "@/components/icons/HistoryIcon";
import { MathematicsIcon } from "@/components/icons/MathematicsIcon";
import { ScienceIcon } from "@/components/icons/ScienceIcon";
import { SocialPoliticalScienceIcon } from "@/components/icons/SocialPoliticalScienceIcon";
import { SocialScienceIcon } from "@/components/icons/SocialScienceIcon";

export type SubjectIconComponent = ComponentType<{
  size: number;
  style?: CSSProperties;
}>;

const SUBJECT_ICONS: Readonly<Record<string, SubjectIconComponent>> = {
  English: EnglishIcon,
  Mathematics: MathematicsIcon,
  Science: ScienceIcon,
  "Social Science": SocialScienceIcon,
  History: HistoryIcon,
  Geography: GeographyIcon,
  "Social & Political Science": SocialPoliticalScienceIcon,
};

export function SubjectIcon({
  subject,
  size,
  style,
}: {
  subject: string;
  size: number;
  style?: CSSProperties;
}) {
  const Component = SUBJECT_ICONS[subject] ?? BookOpen;
  return createElement(Component, { size, style });
}

/**
 * Mascot artwork per subject.
 *
 * Presentation only, exactly like SUBJECT_ICONS above — listing a subject here
 * does not make it selectable, and a subject absent from the map still renders
 * with the neutral reading pose rather than nothing. Geography is deliberately
 * unmapped until its own pose exists; the two Social subjects share the globe
 * pose because it reads correctly for both.
 */
const SUBJECT_MASCOTS: Readonly<Record<string, string>> = {
  English: "/mascots/subjects/english.webp",
  Mathematics: "/mascots/subjects/maths.webp",
  Science: "/mascots/subjects/science.webp",
  "Social Science": "/mascots/subjects/social-science.webp",
  "Social & Political Science": "/mascots/subjects/social-science.webp",
  History: "/mascots/subjects/history.webp",
};

const FALLBACK_MASCOT = "/mascots/subjects/reading.webp";

/** Artwork URL for a subject, falling back to the neutral reading pose. */
export function subjectMascot(subject: string): string {
  return SUBJECT_MASCOTS[subject] ?? FALLBACK_MASCOT;
}
