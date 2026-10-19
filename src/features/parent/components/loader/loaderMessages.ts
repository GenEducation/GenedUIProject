import type { ParentLoaderStage } from "@/stores/useLoaderStore";

/**
 * Live status lines for the parent loader. Each stage is a short sequence the
 * loader steps through while it waits; they describe what is genuinely
 * happening rather than filling time.
 */
const STAGE_LINES: Record<ParentLoaderStage, string[]> = {
  signup: ["Creating your family account", "Setting up your parent space"],
  "signin-handoff": ["Signed in securely", "Opening your parent portal"],
  entry: ["Opening your parent portal", "Finding your children"],
};

export const SLOW_LINE = "Still working, thanks for your patience";

/** Shown once a wait passes this long. */
export const SLOW_AFTER_MS = 6000;

/** First names, so the line stays short: "Aarav Sharma" → "Aarav". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Aarav" · "Aarav & Priya" · "Aarav, Priya & 1 more". */
export function namesLine(names: string[]): string {
  const first = names.map(firstName).filter(Boolean);
  if (first.length === 0) return "";
  if (first.length === 1) return first[0];
  if (first.length === 2) return `${first[0]} & ${first[1]}`;
  return `${first[0]}, ${first[1]} & ${first.length - 2} more`;
}

/** The line once we know whose progress is loading. */
export function gatheringLine(names: string[]): string | null {
  const who = namesLine(names);
  if (!who) return null;
  return names.length > 2 ? `Gathering progress for ${who}` : `Gathering ${who}'s progress`;
}

/**
 * The lines to step through for a stage. During portal entry, once the
 * children are known, the last line names them.
 */
export function stageLines(stage: ParentLoaderStage, childNames: string[] = []): string[] {
  const lines = [...STAGE_LINES[stage]];
  const gathering = stage === "entry" ? gatheringLine(childNames) : null;
  if (gathering) lines.push(gathering);
  return lines;
}
