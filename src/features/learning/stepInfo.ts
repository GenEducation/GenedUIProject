import { ALREADY_COVERED_NOTE, glossaryEntry } from "./reading/book";
import type { DiscussionPrompt, LessonConcept, LessonOutcome, TeacherPayload } from "./types";

/** A worked example printed in one of the step's sections. */
export interface StepExample {
  id: string;
  section: string;
  text: string;
  page: number;
}

/** A word the book glosses for the step. */
export interface KeyWord {
  id: string;
  term: string;
  meaning: string;
}

/** The book's own notes for the step: its summary points, the words it glosses and its side notes. */
export interface StepNotes {
  summary: Array<{ id: string; text: string }>;
  keyWords: KeyWord[];
  notes: Array<{ id: string; text: string }>;
}

/** What the lesson's quick pop-ups show for the current step, all of it from the teacher payload. */
export interface StepInfo {
  outcomes: LessonOutcome[];
  concepts: LessonConcept[];
  examples: StepExample[];
  practice: DiscussionPrompt[];
  notes: StepNotes;
}

export const EMPTY_STEP_INFO: StepInfo = {
  outcomes: [],
  concepts: [],
  examples: [],
  practice: [],
  notes: { summary: [], keyWords: [], notes: [] },
};

/**
 * Book text as one reads it: a printed answer box ("[  ]") is dropped, the PDF's line wraps are joined, and a break is kept
 * only before a numbered or lettered part ("(ii)", "3.", "b)") so a question's parts stay on their own lines.
 */
export function readable(text: string): string {
  return text
    .replace(/\[\s*\]/g, "")
    .replace(/[ \t]*\n\s*(?=\(?(?:[ivx]+|[a-h]|\d+)[.)]\s)/g, "\u0000")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\u0000/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** A note written for the teacher, or the backend's "already read" marker: never shown to the learner. */
function forTeacher(text: string): boolean {
  return text.trim() === ALREADY_COVERED_NOTE || /^\s*notes?\s+(?:for|to)\s+(?:the\s+)?teachers?\b/i.test(text);
}

/** A summary's own heading ("Summary", "Key Points"): a few words with no sentence end, not a point. */
function isHeading(text: string): boolean {
  return text.split(/\s+/).length < 5 && !/[.?!:]$/.test(text);
}

/** A glossed word: "word: meaning", with a short term. Anything longer is a side note that happens to hold a colon. */
function asKeyWord(text: string): { term: string; meaning: string } | null {
  const { term, meaning } = glossaryEntry(text);
  if (!term || !meaning || term.length > 32 || term.split(/\s+/).length > 4) return null;
  return { term, meaning };
}

/**
 * The step's concepts, examples, practice prompts and notes, read from the payload the screen already holds. Every field
 * is optional: a session stored as an older payload version has none of them, and its pop-ups then offer the tutor instead.
 * Tutor-only material (teacher notes, misconceptions, mastery) is never part of it.
 */
export function stepInfo(payload: TeacherPayload | null | undefined): StepInfo {
  const node = payload?.node;
  if (!node) return EMPTY_STEP_INFO;

  const sectionChunks = (node.sections ?? []).flatMap((section) =>
    section.chunks.map((chunk) => ({ ...chunk, section: section.title })),
  );
  const passageNotes = (node.passages ?? []).flatMap((passage) =>
    passage.segments.flatMap((segment) => segment.chunks.filter((c) => c.element_type === "note")),
  );

  const seen = new Set<string>();
  const fresh = (text: string) => {
    const key = text.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  const examples = sectionChunks
    .filter((c) => c.element_type === "worked_example")
    .map((c) => ({ id: c.id, section: c.section, text: readable(c.text), page: c.page }))
    .filter((c) => fresh(c.text));

  const notes: StepNotes = { summary: [], keyWords: [], notes: [] };
  for (const chunk of [...sectionChunks, ...passageNotes]) {
    if (forTeacher(chunk.text)) continue;
    if (chunk.element_type === "summary") {
      const text = readable(chunk.text);
      if (!isHeading(text) && fresh(text)) notes.summary.push({ id: chunk.id, text });
    } else if (chunk.element_type === "note" || chunk.element_type === "vocabulary" || chunk.element_type === "did_you_know") {
      // One printed gloss box may hold several words, each starting a line with "word:".
      const entries = chunk.element_type === "did_you_know" ? [chunk.text] : chunk.text.split(/\n(?=[^\n:]{1,32}:)/);
      entries.forEach((entry, i) => {
        const text = readable(entry);
        if (!fresh(text)) return;
        const word = chunk.element_type === "did_you_know" ? null : asKeyWord(text);
        if (word) notes.keyWords.push({ id: `${chunk.id}:${i}`, ...word });
        else notes.notes.push({ id: `${chunk.id}:${i}`, text });
      });
    }
  }

  return {
    outcomes: (node.parent_los ?? []).filter((lo) => lo.title?.trim()),
    concepts: (node.components ?? []).filter((c) => c.title?.trim()),
    examples,
    practice: (node.discussion_prompts ?? [])
      .map((p) => ({ id: p.id, prompt: readable(p.prompt) }))
      .filter((p) => p.prompt),
    notes,
  };
}

/** How many things a pop-up holds, for the chip's count. */
export function stepInfoCounts(info: StepInfo) {
  const { summary, keyWords, notes } = info.notes;
  return {
    concepts: info.concepts.length,
    examples: info.examples.length,
    practice: info.practice.length,
    notes: summary.length + keyWords.length + notes.length,
  };
}
