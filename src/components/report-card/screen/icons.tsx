import React from "react";
import {
  ArrowRight, BookOpen, Check, CircleArrowRight, BookOpenCheck, Calculator, CalendarDays, ChartLine, ChevronDown, CircleAlert, CircleCheck,
  ClipboardCheck, Clock, Download, Flag, FlaskConical, Globe, Landmark, Languages, Layers, Lightbulb, Minus, PencilLine,
  PlayCircle, RefreshCw, Sparkles, Target, TrendingDown, TrendingUp, Trophy, type LucideIcon,
} from "lucide-react";

// The report card's icons: vector line icons (lucide, as the rest of the app uses), drawn in the report's teal unless a
// colour is given. The names are the report's own, so a screen says what an icon means, not which glyph it is.

export type ReportIconName =
  | "subjects/english" | "subjects/mathematics" | "subjects/science"
  | "subjects/social-science" | "subjects/hindi" | "subjects/history"
  | "metrics/average-mastery" | "metrics/chapters-completed" | "metrics/tests"
  | "subject-card-stats/stat-chapters" | "subject-card-stats/stat-sessions"
  | "subject-card-stats/stat-latest-activity"
  | "insights/key-insight" | "insights/ai-insight" | "insights/positive-insight" | "insights/needs-attention"
  | "trends/subject-trends" | "trends/increase" | "trends/decrease" | "trends/no-change"
  | "filters/date-filter" | "misc/download" | "misc/refresh"
  | "actions/right-arrow" | "actions/dropdown" | "actions/next" | "marks/check" | "marks/flag"
  | "session-content/time" | "session-content/reading" | "session-content/practice"
  | "session-content/achievement";

const ICONS: Record<ReportIconName, LucideIcon> = {
  "subjects/english": BookOpen,
  "subjects/mathematics": Calculator,
  "subjects/science": FlaskConical,
  "subjects/social-science": Globe,
  "subjects/hindi": Languages,
  "subjects/history": Landmark,
  "metrics/average-mastery": Target,
  "metrics/chapters-completed": BookOpenCheck,
  "metrics/tests": ClipboardCheck,
  "subject-card-stats/stat-chapters": Layers,
  "subject-card-stats/stat-sessions": PlayCircle,
  "subject-card-stats/stat-latest-activity": CalendarDays,
  "insights/key-insight": Lightbulb,
  "insights/ai-insight": Sparkles,
  "insights/positive-insight": CircleCheck,
  "insights/needs-attention": CircleAlert,
  "trends/subject-trends": ChartLine,
  "trends/increase": TrendingUp,
  "trends/decrease": TrendingDown,
  "trends/no-change": Minus,
  "filters/date-filter": CalendarDays,
  "misc/download": Download,
  "misc/refresh": RefreshCw,
  "actions/right-arrow": ArrowRight,
  "actions/dropdown": ChevronDown,
  "actions/next": CircleArrowRight,
  "marks/check": Check,
  "marks/flag": Flag,
  "session-content/time": Clock,
  "session-content/reading": BookOpen,
  "session-content/practice": PencilLine,
  "session-content/achievement": Trophy,
};

/** Thinner strokes for big icons, a touch heavier for small ones, so every size reads with the same weight. */
const stroke = (size: number) => (size >= 22 ? 1.8 : size <= 13 ? 2.4 : 2);

/** A report icon in the brand teal. Decorative: pair it with visible text. */
export function Icon({ name, size = 20, className = "" }: { name: ReportIconName; size?: number; className?: string }) {
  return <TintIcon name={name} color="var(--rs-brand)" size={size} className={className} />;
}

/** The same icon in a given colour, e.g. a mastery band's, or white on a fill. */
export function TintIcon({
  name, color, size = 16, className = "",
}: {
  name: ReportIconName;
  color: string;
  size?: number;
  className?: string;
}) {
  const Glyph = ICONS[name];
  return <Glyph aria-hidden size={size} strokeWidth={stroke(size)} color={color} className={`inline-block shrink-0 ${className}`} />;
}

// First match wins: "Social Science" must not pick up the science flask, and
// History has its own glyph before the wider social-studies group.
const SUBJECT_GLYPHS: [RegExp, ReportIconName][] = [
  [/history/i, "subjects/history"],
  [/social|geography|civics|political|economics/i, "subjects/social-science"],
  [/hindi|sanskrit/i, "subjects/hindi"],
  [/english|literature|grammar/i, "subjects/english"],
  [/math|algebra|geometry|arithmetic/i, "subjects/mathematics"],
  [/science|physics|chemistry|biology|evs/i, "subjects/science"],
];

/** The subject's icon; a generic book otherwise. */
export function subjectIconName(subject: string): ReportIconName {
  return SUBJECT_GLYPHS.find(([pattern]) => pattern.test(subject))?.[1] ?? "session-content/reading";
}
