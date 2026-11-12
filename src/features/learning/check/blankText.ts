/**
 * Where a blanks check's blanks sit in its sentence, so they can be filled in place. A blank is marked in the prompt as `[n]` (the
 * blank numbered n) or as a run of three or more underscores (the next blank in order, as partners author them). The sentence is
 * split only when every blank is marked exactly once and nothing else is; otherwise null, and the blanks are shown in a row under the
 * question as before. Display only: what is sent is still each blank's number and the word put in it.
 */
export type BlankPiece = { text: string } | { blank: string };

const MARK = /\[(\d+)\]|_{3,}/g;

export function blankPieces(prompt: string, blanks: string[]): BlankPiece[] | null {
  if (blanks.length === 0) return null;
  const pieces: BlankPiece[] = [];
  const used = new Set<string>();
  let last = 0;
  let next = 0;
  for (const match of prompt.matchAll(MARK)) {
    const blank = match[1] ?? blanks[next];
    if (blank === undefined || !blanks.includes(blank) || used.has(blank)) return null;
    if (match[1] === undefined) next += 1;
    used.add(blank);
    if (match.index > last) pieces.push({ text: prompt.slice(last, match.index) });
    pieces.push({ blank });
    last = match.index + match[0].length;
  }
  if (used.size !== blanks.length) return null;
  if (last < prompt.length) pieces.push({ text: prompt.slice(last) });
  return pieces;
}
