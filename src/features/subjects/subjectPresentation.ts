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
 * Subject artwork: a small paper diorama per subject (Blender renders, scripts/render-student-moments.py), in the
 * dashboard's paper-and-ink style with the logo's colours.
 *
 * The core subjects carry a rendered hover move: `still` is its first frame (the card at rest) and `sprite` the
 * whole move, frames laid out in a grid the card steps through on hover. English: the lighthouse of books sweeps its
 * beam. Mathematics: the abacus bridge runs its lime bead along the rod over the pond of maths, a set square and maths signs bobbing in its sky. Science: the
 * observatory looks at the moon, then the planet, and holds there (`hold`). Other subjects show a still diorama;
 * a subject absent from the map gets the bookshelf. Presentation only, like SUBJECT_ICONS above.
 */
const ART = "/student/subjects";
/** Bumped on every re-render: the files keep their names, so this is what makes browsers fetch the new ones. */
const V = "?v=subj5";

export interface SubjectArt {
  /** The resting picture (also the first frame of the hover move). */
  still: string;
  /** Where the plinth's bottom sits, as % down the picture: the card puts its ground shadow there. */
  ground: number;
  /** Layered stills (base + lime accent) for subjects without a move: drawn over `still`. */
  accent?: string;
  sprite?: { src: string; frames: number; cols: number; fps: number; hold: boolean };
}

const moving = (name: string, ground: number, frames: number, cols: number, hold = false): SubjectArt => ({
  still: `${ART}/${name}.webp${V}`,
  ground,
  // every other frame of the render ships, so the moves play at 15fps (half the download and memory)
  sprite: { src: `${ART}/${name}-sprite.webp${V}`, frames, cols, fps: 15, hold },
});
const resting = (name: string, ground: number): SubjectArt => ({ still: `${ART}/${name}-base.webp${V}`, accent: `${ART}/${name}-accent.webp${V}`, ground });

const SUBJECT_ART: Readonly<Record<string, SubjectArt>> = {
  // ground: measured from each render's pixels
  // the three share one frame, scale and ground line (scripts/crop-subject-moves.py)
  English: moving("english-move", 87.5, 16, 6),
  Mathematics: moving("maths-move", 87.3, 19, 6),
  Science: moving("science-move", 88.0, 25, 8, true),
  "Social Science": resting("social", 66.8),
  "Social & Political Science": resting("social", 66.8),
  History: resting("history", 78),
  Geography: resting("geography", 77),
  Hindi: resting("hindi", 71.2),
};

/** The subject's diorama, falling back to the bookshelf. */
export function subjectArt(subject: string): SubjectArt {
  return SUBJECT_ART[subject] ?? resting("fallback", 69.3);
}
