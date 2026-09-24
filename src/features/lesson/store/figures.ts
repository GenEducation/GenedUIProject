import type { FigureGroup, ManifestFigure, PresentationManifest, TeacherPayload } from "../types/lesson";

/** Every figure group the current payload references: teaching, reference, and every check's own. */
export function allFigureGroups(payload: TeacherPayload): FigureGroup[] {
  const node = payload.node;
  return [...node.figure_groups, ...node.reference_groups, ...node.check_items.flatMap((c) => c.figure_groups)];
}

/** Looks a presented figure group up by id, wherever the payload holds it. */
export function findFigureGroup(payload: TeacherPayload, groupId: string): FigureGroup | null {
  return allFigureGroups(payload).find((g) => g.id === groupId) ?? null;
}

/** The manifest's signed URL and dimensions for one crop, or null while the manifest hasn't loaded (yet). */
export function manifestFigure(manifest: PresentationManifest | null, cropId: string): ManifestFigure | null {
  return manifest?.figures[cropId] ?? null;
}
