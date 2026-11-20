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
 * 3D island artwork per subject (Blender renders, 600px transparent WebP).
 *
 * Each island is built from its subject: English is a stack of books under a
 * pop-up castle, Maths is squared paper on stepped cubes, Science a lab-tile
 * floor over crystal rock, and so on. Presentation only, like SUBJECT_ICONS
 * above: a subject absent from the map gets the neutral library island. The two
 * Social subjects share the map-and-town island.
 */
const SUBJECT_ISLANDS: Readonly<Record<string, string>> = {
  English: "/student/islands/english.webp",
  Mathematics: "/student/islands/maths.webp",
  Science: "/student/islands/science.webp",
  "Social Science": "/student/islands/social-science.webp",
  "Social & Political Science": "/student/islands/social-science.webp",
  History: "/student/islands/history.webp",
  Geography: "/student/islands/geography.webp",
};

const FALLBACK_ISLAND = "/student/islands/reading.webp";

/** Island artwork URL for a subject, falling back to the library island. */
export function subjectIsland(subject: string): string {
  return SUBJECT_ISLANDS[subject] ?? FALLBACK_ISLAND;
}

/**
 * The same island rendered without its contact shadow, for places where it
 * floats (the continue card draws a breathing shadow of its own under it).
 */
export function subjectIslandFloating(subject: string): string {
  return subjectIsland(subject).replace(/\.webp$/, "-float.webp");
}
