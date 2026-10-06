/**
 * Themes for loading-screen fun facts, and the icon each one renders with.
 *
 * A theme names what a fact is *about*, not the noun it mentions. That is
 * deliberate: no standard icon set has an octopus, a flamingo or a tardigrade,
 * so a per-fact mapping would put the same generic glyph on a dozen unrelated
 * facts. Reading the icon as a category instead keeps every one of them
 * intentional.
 *
 * When adding a fact, pick the theme that describes its subject matter. If
 * nothing fits, add a theme here rather than forcing a bad match — but check
 * first that the new theme will carry more than one fact.
 */
import {
  Atom,
  BookOpen,
  Bug,
  CloudLightning,
  Dices,
  Feather,
  Globe,
  Hand,
  Hash,
  HeartPulse,
  Hourglass,
  Infinity as InfinityIcon,
  Landmark,
  Languages,
  Lightbulb,
  Mountain,
  Orbit,
  PawPrint,
  Ruler,
  Shapes,
  Sprout,
  Type,
  Waves,
  type LucideIcon,
} from "lucide-react";

export type FactTheme =
  | "space"
  | "matter"
  | "weather"
  | "earth"
  | "ocean"
  | "creatures"
  | "birds"
  | "tiny-life"
  | "plants"
  | "body"
  | "numbers"
  | "geometry"
  | "chance"
  | "infinity"
  | "measure"
  | "wordplay"
  | "books"
  | "etymology"
  | "communication"
  | "world"
  | "landmarks"
  | "timeline"
  | "invention";

export const FACT_THEME_ICONS: Readonly<Record<FactTheme, LucideIcon>> = {
  space: Orbit,
  matter: Atom,
  weather: CloudLightning,
  earth: Mountain,
  ocean: Waves,
  creatures: PawPrint,
  birds: Feather,
  "tiny-life": Bug,
  plants: Sprout,
  body: HeartPulse,
  numbers: Hash,
  geometry: Shapes,
  chance: Dices,
  infinity: InfinityIcon,
  measure: Ruler,
  wordplay: Type,
  books: BookOpen,
  etymology: Languages,
  communication: Hand,
  world: Globe,
  landmarks: Landmark,
  timeline: Hourglass,
  invention: Lightbulb,
};
