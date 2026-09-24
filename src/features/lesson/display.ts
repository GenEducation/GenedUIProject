import type { Chunk } from "./types/lesson";

/**
 * The numeric answer grammar, mirroring `gened_assessment.numeric.parse_number` in the
 * backend: an optional sign, then an integer or decimal, a fraction `a/b`, or a mixed
 * number `w a/b` (up to 9 digits per part, non-zero denominator). An answer outside it
 * cannot be marked, so the card says so before sending rather than after.
 */
const D = String.raw`\d{1,9}`;
const INTEGER_OR_DECIMAL = new RegExp(String.raw`^[+-]?${D}(?:\.\d{1,9})?$`);
const FRACTION = new RegExp(String.raw`^[+-]?${D}\s*/\s*(${D})$`);
const MIXED = new RegExp(String.raw`^[+-]?${D}\s+${D}\s*/\s*(${D})$`);

export function isReadableNumber(text: string): boolean {
  const s = text.trim().split(/\s+/).join(" ");
  if (INTEGER_OR_DECIMAL.test(s)) return true;
  const fraction = FRACTION.exec(s) ?? MIXED.exec(s);
  return fraction !== null && Number(fraction[1]) !== 0;
}

/**
 * Textbook exercise numbering carried into a question's text by ingestion
 * ("Figure it Out 1. How many…", "4. How many…"). It means nothing on its own
 * card, so it is not shown.
 */
export function cleanPrompt(prompt: string): string {
  return prompt.replace(/^\s*(figure it out\s*)?\d{1,2}\s*[.)]\s+/i, "").replace(/^\s*figure it out[:.]?\s+/i, "");
}

/** Multiplication written as `*` or `x` between numbers becomes `×`; nothing else changes. */
export function prettifyMath(text: string): string {
  return text.replace(/(\d|\))\s*[*xX]\s*(?=[\d(])/g, "$1 × ");
}

const SENTENCE_END = /[.!?:;)"'”’]\s*$/;
const MERGEABLE = new Set(["paragraph"]);

/**
 * Ingestion reads a textbook page by page, so a paragraph that runs across a page
 * break arrives as two chunks, the first ending mid-sentence. Joining them restores
 * the sentence; chunks of any other type are left exactly as they are.
 */
export function joinPageBreaks(chunks: Chunk[]): Chunk[] {
  const out: Chunk[] = [];
  for (const chunk of chunks) {
    const previous = out[out.length - 1];
    if (
      previous &&
      MERGEABLE.has(previous.element_type) &&
      MERGEABLE.has(chunk.element_type) &&
      !SENTENCE_END.test(previous.text) &&
      /^[a-z(]/.test(chunk.text.trim())
    ) {
      out[out.length - 1] = { ...previous, text: `${previous.text.trimEnd()} ${chunk.text.trimStart()}` };
    } else {
      out.push(chunk);
    }
  }
  return out;
}
