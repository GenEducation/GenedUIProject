import type { Passage, PassageChunk, ReadingRole } from "../types";

/** One part of a text as the book panel draws it: its running text, and the glossary entries printed beside it. */
export interface BookPart {
  segment: number;
  paragraphs: PassageChunk[];
  glossary: PassageChunk[];
}

/** A text ready to draw: its title and its parts in the book's order. */
export interface BookText {
  id: string;
  title: string;
  parts: BookPart[];
}

/**
 * The step's passages as the panel draws them. Order is the payload's (book order, which the learner may scroll back
 * through); nothing is added, reworded or reordered, and a segment the payload does not hold is never invented. A
 * glossary entry is a `note` chunk: it is drawn apart from the running text so the story reads straight through.
 */
export function bookTexts(passages: Passage[] | undefined): BookText[] {
  return (passages ?? [])
    .map((passage) => ({
      id: passage.id,
      title: passage.title,
      parts: passage.segments
        .map((segment) => ({
          segment: segment.segment,
          paragraphs: segment.chunks.filter((c) => c.element_type !== "note"),
          glossary: segment.chunks.filter((c) => c.element_type === "note"),
        }))
        .filter((part) => part.paragraphs.length > 0 || part.glossary.length > 0),
    }))
    .filter((text) => text.parts.length > 0);
}

/**
 * Whether the book opens by itself when the step starts. A text the step is about to ask on, or hold, is open: the
 * learner has the words in front of them. Opening is never counted as anything: reading is not an answer, an
 * engagement or progress, and the panel sends nothing.
 */
export function opensWithStep(role: ReadingRole | null | undefined, texts: BookText[]): boolean {
  return texts.length > 0 && (role === "reading" || role === "post_reading" || role === "mixed");
}

/** A glossary entry printed as "word: meaning", split at the first colon; an entry with none stays whole. */
export function glossaryEntry(text: string): { term: string | null; meaning: string } {
  const at = text.indexOf(":");
  if (at <= 0) return { term: null, meaning: text };
  return { term: text.slice(0, at).trim(), meaning: text.slice(at + 1).trim() };
}

/** One chunk of a section as the book shows it. */
export interface SectionChunk {
  id: string;
  element_type?: string;
  text: string;
}

/** A section of the book the step teaches from (maths, science and any chapter with no passage). */
export interface BookSection {
  id: string;
  title: string;
  chunks: SectionChunk[];
}

/** The note the backend puts in a section the learner already read earlier in the chapter (a collapsed repeat): not book text. */
export const ALREADY_COVERED_NOTE = "You've already read this section earlier in this chapter — continuing from there.";

/**
 * The step's own sections as the panel shows them, for a chapter with no passages (maths, science). A section collapsed to the
 * "already read" note is left out: it holds no book text. A step with a reading role has passages instead, so none is shown here.
 */
export function bookSections(
  sections: Array<{ id: string; title: string; chunks: SectionChunk[] }> | undefined,
  hasPassages: boolean,
  role: ReadingRole | null | undefined,
): BookSection[] {
  if (hasPassages || role) return [];
  return (sections ?? [])
    .map((section) => ({
      id: section.id,
      title: section.title,
      chunks: section.chunks.filter((c) => c.text.trim() && c.text !== ALREADY_COVERED_NOTE),
    }))
    .filter((section) => section.chunks.length > 0);
}
