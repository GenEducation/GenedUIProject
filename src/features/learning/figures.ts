import type { FigureGroup, TeacherPayload } from "./types";

/** Every figure group the current payload knows: the node's, then each check's. */
export function figureGroupsOf(payload: TeacherPayload | null): Map<string, FigureGroup> {
  const groups = new Map<string, FigureGroup>();
  if (!payload) return groups;
  for (const group of payload.node.figure_groups) groups.set(group.id, group);
  for (const check of payload.node.check_items) for (const group of check.figure_groups) groups.set(group.id, group);
  return groups;
}

/** A group's learner-facing description. Never `tutor_description`: that is the tutor's, not the learner's. */
export const altTextOf = (group: FigureGroup | undefined): string =>
  group?.figures.map((f) => f.learner_alt_text).join(" ") ?? "";
