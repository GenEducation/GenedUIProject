import type { Announcements } from "@dnd-kit/core";

/**
 * Dragging on a question card is for the pointer only: the card's own buttons are the keyboard's and screen reader's way to the same
 * answer, and each card says what changed in its own live note, in the lesson's language. So dnd-kit's built-in English
 * announcements are turned off here (they would repeat the note in another language).
 */
const silent: Announcements = {
  onDragStart: () => undefined,
  onDragMove: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

export const SILENT_DRAG = { announcements: silent, screenReaderInstructions: { draggable: "" } };
