/**
 * What the recogniser heard against the words of the text, for read-aloud practice (W1). Practice only: nothing here scores,
 * grades or claims anything about how the learner read. A word that was "not picked up" may be a word the recogniser missed
 * (a quiet voice, an unusual name, a number spoken for a digit); it is never reported as a reading mistake.
 *
 * Words are compared after Unicode normalisation and case folding. Letters and combining marks (an Indic vowel sign is
 * part of its word) are kept; punctuation and symbols are not words.
 */

export interface WordMark {
  word: string;
  heard: boolean;
}

export interface Alignment {
  words: WordMark[];
  /** Words of the text the recogniser picked up, in order. */
  heardCount: number;
  /** Words the recogniser returned that are not in the part shown (the learner said something else, or read on). */
  extra: number;
  /** Nothing was recognised at all. */
  silent: boolean;
}

const WORD = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;

export const wordsOf = (text: string): string[] => text.normalize("NFC").match(WORD) ?? [];
const fold = (word: string) => word.normalize("NFC").toLocaleLowerCase();

/** Which words of `expected` appear, in order, in `heard` (a longest common subsequence: reading a word twice or skipping one
 * does not shift every later word). */
export function alignWords(expected: string, heard: string): Alignment {
  const want = wordsOf(expected);
  const got = wordsOf(heard);
  const a = want.map(fold);
  const b = got.map(fold);
  const n = a.length;
  const m = b.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const matched = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matched.add(i);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return {
    words: want.map((word, index) => ({ word, heard: matched.has(index) })),
    heardCount: matched.size,
    extra: Math.max(0, got.length - matched.size),
    silent: got.length === 0,
  };
}

export interface Feedback {
  headline: string;
  /** The words not picked up, for "try them again"; empty when every word was. */
  missed: string[];
  note: string;
}

const NOTE = "This is only what the listener picked up. It isn't a test and it isn't scored.";

/** Plain, encouraging words for the result. Always "heard" and "picked up", never "wrong", "mispronounced" or a score. */
export function feedbackFor(result: Alignment): Feedback {
  if (result.silent) {
    return { headline: "I didn't catch anything that time. Check your microphone, then try again.", missed: [], note: NOTE };
  }
  const missed = result.words.filter((w) => !w.heard).map((w) => w.word);
  if (missed.length === 0) return { headline: "I heard every word. Thank you for reading it out!", missed, note: NOTE };
  if (result.heardCount === 0) {
    return { headline: "I couldn't match what I heard to this part. Want to try reading it again?", missed: [], note: NOTE };
  }
  return { headline: "I heard most of it. These words weren't picked up. Want to try them again?", missed, note: NOTE };
}

/** The first few sentences of a part: a short piece to read aloud, not the whole story. */
export function practiceExcerpt(text: string, sentences = 3): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const pieces = flat.split(/(?<=[.!?।॥])\s+/);
  return pieces.slice(0, sentences).join(" ");
}
