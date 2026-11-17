import type { ReadingRole } from "../types";
import type { ListenPhase } from "./useSegmentAudio";

/**
 * The book footer's rule book: which buttons show, which are disabled, in every state of the lesson. The footer draws only what
 * these return, so a button never appears where it would do nothing, contradict the lesson's order, or pull the learner off a
 * question. Pure: every rule is a row in the tests.
 */

export type TutorButtonsState = {
  /** The step's reading role; `null` for a chapter with no passages (maths, science). */
  role: ReadingRole | null | undefined;
  /** The content-led lesson's phase, or `null` for a lesson that is not content-led. */
  contentPhase: string | null;
  /** A question is on screen (presented and unanswered, or its feedback is being given). */
  questionOpen: boolean;
  /** The step has text to read. */
  hasText: boolean;
  /** A tutor reply is streaming. */
  replying: boolean;
  /** A voice session is on: the tutor speaks, and reads the book aloud itself. */
  voice: boolean;
  /** The learner already pressed each button for the part open now (reset when the part changes). */
  pressed: { readWithMe: boolean; readIt: boolean };
};

export type TutorButtons = {
  readWithMe: { label: "Read with me" | "Keep reading with me"; disabled: boolean } | null;
  readIt: { disabled: boolean } | null;
};

/**
 * "Read with your tutor": both buttons start a conversation turn, so they show only where reading together makes sense.
 * - Content-led lessons hide both: the server chooses each part and the tutor teaches it, and "Read with me" reads the text's
 *   first part, which would fight that order.
 * - A question on screen, a voice session or no text hides both.
 * - "Read with me" is for a step that reads (`reading`, `mixed`); after a press it reads on ("Keep reading with me").
 * - "I've read it" is a one-time statement per part, for a step whose text is read (`reading`, `post_reading`, `mixed`).
 * - A reply streaming disables, never hides, so the row does not jump.
 */
export function tutorButtons(state: TutorButtonsState): TutorButtons {
  const off = { readWithMe: null, readIt: null };
  if (!state.hasText || state.voice || state.questionOpen || state.contentPhase !== null) return off;
  const role = state.role;
  const readWithMe =
    role === "reading" || role === "mixed"
      ? { label: state.pressed.readWithMe ? ("Keep reading with me" as const) : ("Read with me" as const), disabled: state.replying }
      : null;
  const readIt =
    (role === "reading" || role === "post_reading" || role === "mixed") && !state.pressed.readIt ? { disabled: state.replying } : null;
  return { readWithMe, readIt };
}

export type ListenButtonsState = {
  /** The part's language is known, so it can be listened to and practised. */
  audible: boolean;
  /** A voice session is on: the tutor's voice owns the speaker. */
  voice: boolean;
  phase: ListenPhase;
  /** The microphone can be used here. */
  canCapture: boolean;
  /** The part has sentences to practise. */
  hasExcerpt: boolean;
  /** The practice panel is open. */
  practising: boolean;
};

export type ListenButtons = {
  /** The whole "Listen & practise" group; `false` hides it. */
  shown: boolean;
  /** The one listen button, whose job follows the state. */
  main: { action: "play" | "pause" | "resume"; label: string; disabled: boolean } | null;
  stop: boolean;
  again: boolean;
  practice: boolean;
};

/**
 * "Listen & practise": audio only, never sent to the tutor.
 * - Hidden when the part has no known language, or a voice session is speaking.
 * - One listen button: Listen → Getting it ready… → Pause ⇄ Keep listening. Stop and Again appear only while there is
 *   something to stop or restart.
 * - "Give reading a try" needs a microphone and sentences, and nothing playing; once open, its panel takes the group over.
 * - Stays during a question: a question on a text may need it heard again.
 */
export function listenButtons(state: ListenButtonsState): ListenButtons {
  const hidden = { shown: false, main: null, stop: false, again: false, practice: false };
  if (!state.audible || state.voice) return hidden;
  if (state.practising) return { ...hidden, shown: true };
  const going = state.phase === "playing" || state.phase === "paused";
  const main =
    state.phase === "playing"
      ? { action: "pause" as const, label: "Pause", disabled: false }
      : state.phase === "paused"
        ? { action: "resume" as const, label: "Keep listening", disabled: false }
        : state.phase === "loading"
          ? { action: "play" as const, label: "Getting it ready…", disabled: true }
          : { action: "play" as const, label: "Listen", disabled: false };
  return {
    shown: true,
    main,
    stop: going,
    again: going,
    practice: state.canCapture && state.hasExcerpt && state.phase === "idle",
  };
}
