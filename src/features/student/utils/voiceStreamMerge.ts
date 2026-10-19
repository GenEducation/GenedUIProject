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
/**
 * A handful of real English words short enough to be mistaken for a
 * tokenizer fragment (below). Checked lowercase.
 */
const SHORT_WHOLE_WORDS = new Set([
  "a", "i", "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if",
  "in", "is", "it", "me", "my", "no", "of", "oh", "ok", "on", "or", "so",
  "to", "up", "us", "we",
]);

/** Punctuation that always attaches to what precedes it, never preceded by a space. */
const ATTACHES_LEFT = /^['’.,!?;:)\]}%-]/;

/** The run of letters/digits at the very start of `s`. */
function leadingWord(s: string): string {
  const m = /^[A-Za-z0-9]+/.exec(s);
  return m ? m[0] : "";
}

/**
 * Appends one assistant transcript chunk to the pending buffer, inserting a
 * space between chunks unless there's a good reason not to.
 *
 * The provider chunks by token, not by word, and a word is occasionally
 * split mid-token across packets — "Bu" then "t sometimes" — with no space
 * of its own at that seam. But that's the rare case: the overwhelmingly
 * common one is a chunk boundary that IS a word boundary — "read" then "the"
 * — which needs a space that neither chunk supplies. Always joining verbatim
 * (trusting the provider for every seam) fixes the first case by breaking
 * the second — see the reported bug, where a whole live transcript rendered
 * with virtually every word run together.
 *
 * So: insert a space, unless the chunk already starts with one (or the
 * buffer already ends with one), starts with punctuation that attaches to
 * what came before, or is a short run of letters that isn't itself a real
 * word — the token-fragment case ("t", "s", "g") this buffer exists to
 * rejoin without a gap. A 1–2 letter fragment that IS a real word ("to",
 * "be", "a", "I", …) still gets its space; there are only so many of those
 * in English and `SHORT_WHOLE_WORDS` lists them.
 */
export function appendTranscriptChunk(buffer: string, chunk: string): string {
  if (!chunk) return buffer;
  if (!buffer) return chunk;

  if (/\s$/.test(buffer) || /^\s/.test(chunk) || ATTACHES_LEFT.test(chunk)) {
    return buffer + chunk;
  }

  const lead = leadingWord(chunk);
  const isFragment = lead.length > 0 && lead.length <= 2 && !SHORT_WHOLE_WORDS.has(lead.toLowerCase());
  return isFragment ? buffer + chunk : buffer + " " + chunk;
}

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
