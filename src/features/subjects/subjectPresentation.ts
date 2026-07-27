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
