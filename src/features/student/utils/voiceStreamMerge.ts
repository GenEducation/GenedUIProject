import type { ChatMessage } from "../store/useStudentStore";

/**
 * Pure transcript-merge helper for the live voice session message feed.
 *
 * The live tutor streams its spoken turn incrementally (typewriter) while tool calls
 * interleave visual/widget elements into the SAME assistant message. Two bugs lived in
 * the old "snapshot the in-progress text into a text element when a visual arrives"
 * approach (voice sessions 5a2013dd-… and 012648ad-…):
 *   1. the running text was re-appended after the widget → the same answer rendered twice;
 *   2. snapshotting at the (lagging) typewriter position split the text mid-word and
 *      switched the text from the plain transcript span to the markdown renderer.
 *
 * Fix: the spoken transcript is ALWAYS kept whole in `msg.text` and visuals are stored as
 * visual-only elements (see the visual_block/math_widget handlers). The renderer shows
 * `msg.text` as one continuous block and the visuals after it, so the text is never split
 * and never changes font when a visual appears.
 */
export function appendStreamedText<T extends ChatMessage>(
  msg: T,
  content: string,
  role: "user" | "assistant",
): T {
  // A planning ("Thinking…") bubble is replaced by the first real text, not appended to.
  const newText = msg.isPlanning
    ? content
    : msg.text + (role === "user" ? " " : "") + content;
  return { ...msg, text: newText, isPlanning: false };
}
