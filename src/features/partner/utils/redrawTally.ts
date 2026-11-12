import type { RedrawState, VisualRedrawTally } from "../types/visuals";

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** Copy for each redraw state, as the partner reads it. */
export const REDRAW_STATE_LABEL: Record<RedrawState, string> = {
  queued: "Queued",
  drawing: "Drawing",
  ready: "Ready to review",
  reviewed: "Reviewed",
  failed: "Failed",
};

/** Plain words for a failed redraw's `failure` class. */
export function redrawFailureText(failure: string | null): string {
  switch (failure) {
    case "busy":
      return "The drawing service was busy. Try again in a few minutes.";
    case "not_needed":
      return "The planner decided this needs no picture. Add a note saying what to draw, then try again.";
    case "worker_lost":
      return "The drawing stopped part-way. Try again.";
    case null:
    case undefined:
    case "":
      return "It couldn't be drawn.";
    default:
      return "It couldn't be drawn. Try again with a different note.";
  }
}

/**
 * The publish warning's sentence: "6 redraws still running, 3 waiting for
 * review". Empty when nothing is open.
 */
export function openRedrawsText(
  counts: Pick<VisualRedrawTally, "queued" | "drawing" | "ready">,
): string {
  const running = counts.queued + counts.drawing;
  const parts: string[] = [];
  if (running) parts.push(`${plural(running, "redraw")} still running`);
  if (counts.ready) parts.push(`${counts.ready} waiting for review`);
  return parts.join(", ");
}

/** The counts a 409 `redraws_open` carries, when `details` is one. */
export function openRedrawsFrom(
  details: Record<string, unknown> | undefined,
): VisualRedrawTally | null {
  if (!details || details.reason !== "redraws_open") return null;
  const n = (k: string) =>
    typeof details[k] === "number" ? (details[k] as number) : 0;
  const queued = n("queued");
  const drawing = n("drawing");
  const ready = n("ready");
  return {
    queued,
    drawing,
    ready,
    reviewed: 0,
    failed: 0,
    total: queued + drawing + ready,
    open: queued + drawing + ready,
  };
}
