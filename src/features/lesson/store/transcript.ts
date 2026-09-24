import type { AnswerOutcome, RecordedTurnOut, Section, TurnFailedReason, TurnKind } from "../types/lesson";

/** One exchange on screen: at most one learner line and one tutor reply. */
export interface TranscriptTurn {
  turnId: string;
  kind: TurnKind;
  learnerText: string | null;
  teacherText: string;
  /** Live while its stream is open; frozen once a terminal event lands. */
  status: "streaming" | "completed" | "interrupted" | "failed";
  /** A server `turn_failed` reason, or `connection_lost` when this client could not reach the stream. */
  failedReason?: TurnFailedReason | "connection_lost";
  retryable?: boolean;
  createdAt: string;
  /** How the learner's answer in this turn was marked, shown under their message. */
  answer?: { outcome: AnswerOutcome; correct: boolean | null };
  /** Shown only on this screen, never recorded as a turn (an answer that could not be read). */
  localOnly?: boolean;
  /** The figure FigurePolicy chose to show alongside this turn's reply, if any (at most one per turn). */
  figureGroupId?: string | null;
}

/** A part finished during this visit, kept above the current part's conversation. */
export interface EarlierPart {
  instanceNodeId: string;
  title: string;
  turns: TranscriptTurn[];
}

export function recordedTurnToTranscript(t: RecordedTurnOut): TranscriptTurn {
  const closedStatus = t.status === "interrupted" ? "interrupted" : t.status === "failed" ? "failed" : "completed";
  return {
    turnId: t.turn_id,
    kind: t.kind,
    learnerText: t.learner_text ?? (t.kind === "hint" ? "Can I have a hint?" : null),
    teacherText: t.teacher_text ?? "",
    status: t.closed_at ? closedStatus : "streaming",
    // The recorded turn does not carry its failure reason; offering a retry is safe,
    // because a regenerate the server cannot run is refused with a readable message.
    retryable: closedStatus === "failed" ? true : undefined,
    createdAt: t.created_at,
    answer: t.outcome ? { outcome: t.outcome, correct: t.correct } : undefined,
    figureGroupId: t.figure_group_ids[0] ?? null,
  };
}

/**
 * Recorded turns are canonical; keep what only this client knows: the text of an answer
 * given in a card, and answers that could not be read (never recorded as a turn).
 */
export function mergeTranscript(recorded: TranscriptTurn[], local: TranscriptTurn[]): TranscriptTurn[] {
  const byId = new Map(local.map((t) => [t.turnId, t]));
  const merged = recorded.map((t) => {
    const mine = byId.get(t.turnId);
    if (!mine) return t;
    return { ...t, learnerText: t.learnerText ?? mine.learnerText, answer: t.answer ?? mine.answer };
  });
  const localOnly = local.filter((t) => t.localOnly);
  return [...merged, ...localOnly].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * The tutoring payload replaces a section the learner already met in an earlier part with a
 * single note meant for the tutor (`gened_tutoring.payload`, `_ALREADY_COVERED_NOTE`). It is
 * not textbook content, so the screen never shows it as such.
 */
export function isAlreadyCoveredNote(section: Section): boolean {
  return (
    section.chunks.length === 1 &&
    section.chunks[0].element_type === "note" &&
    section.chunks[0].text.startsWith("You've already read this section")
  );
}
