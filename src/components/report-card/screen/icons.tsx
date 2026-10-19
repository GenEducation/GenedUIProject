import React from "react";
import { MaskIcon } from "../MaskIcon";

// The GenEd icon set (public/report-card/icons), cleaned to transparent
// 128px PNGs. Full-colour icons render as-is; glyphs that must follow a
// mastery band or sit on a filled button are recoloured with a CSS mask.

const BASE = "/report-card/icons";

export type ReportIconName =
  | "subjects/english" | "subjects/mathematics" | "subjects/science"
  | "subjects/social-science" | "subjects/hindi" | "subjects/history"
  | "metrics/average-mastery" | "metrics/chapters-completed" | "metrics/tests"
  | "subject-card-stats/stat-chapters" | "subject-card-stats/stat-sessions"
  | "subject-card-stats/stat-latest-activity"
  | "insights/key-insight" | "insights/ai-insight" | "insights/positive-insight" | "insights/needs-attention"
  | "trends/subject-trends" | "trends/increase" | "trends/decrease" | "trends/no-change"
  | "filters/date-filter" | "misc/download" | "misc/refresh"
  | "actions/right-arrow" | "actions/dropdown"
  | "session-content/time" | "session-content/reading" | "session-content/practice"
  | "session-content/achievement";

export const iconSrc = (name: ReportIconName) => `${BASE}/${name}.png`;

/** A full-colour icon from the set. Decorative: pair it with visible text. */
export function Icon({ name, size = 20, className = "" }: { name: ReportIconName; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static decorative icon
    <img
      src={iconSrc(name)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
      className={`inline-block shrink-0 select-none ${className}`}
    />
  );
}

/** The same glyph recoloured, e.g. by mastery band or white on a fill. */
export function TintIcon({
  name, color, size = 16, className,
}: {
  name: ReportIconName;
  color: string;
  size?: number;
  className?: string;
}) {
  return <MaskIcon src={iconSrc(name)} color={color} size={size} className={className} />;
}

// First match wins: "Social Science" must not pick up the science atom, and
// History has its own glyph before the wider social-studies group.
const SUBJECT_GLYPHS: [RegExp, ReportIconName][] = [
  [/history/i, "subjects/history"],
  [/social|geography|civics|political|economics/i, "subjects/social-science"],
  [/hindi|sanskrit/i, "subjects/hindi"],
  [/english|literature|grammar/i, "subjects/english"],
  [/math|algebra|geometry|arithmetic/i, "subjects/mathematics"],
  [/science|physics|chemistry|biology|evs/i, "subjects/science"],
];

/** The subject's glyph from the GenEd set; a generic document otherwise. */
export function reportSubjectIcon(subject: string): string {
  return iconSrc(SUBJECT_GLYPHS.find(([pattern]) => pattern.test(subject))?.[1] ?? "session-content/reading");
}
