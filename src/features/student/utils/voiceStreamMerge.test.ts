/**
 * Regression tests for the live-voice transcript merge.
 * Runs under Vitest (`npm test`); uses node:assert for the assertions.
 *
 * Guards the voice transcript bugs from sessions 5a2013dd-… and 012648ad-…:
 *   - the assistant answer rendered twice around an interactive block;
 *   - the transcript split mid-word (and changed font) when a visual arrived.
 * Both came from snapshotting the in-progress text into elements. The transcript is now
 * kept whole in `text`; visuals are visual-only elements rendered after it.
 */
import { test } from "vitest";
import assert from "node:assert/strict";

import { appendStreamedText } from "./voiceStreamMerge.ts";
import type { ChatMessage } from "../store/useStudentStore";

const aiMsg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "m",
  text: "",
  sender: "ai",
  timestamp: "",
  ...over,
});

test("streamed assistant chunks reconstruct one continuous transcript", () => {
  let m = aiMsg();
  for (const c of ["Now draw a house.", " Maybe a f", "or", " the walls?"]) {
    m = appendStreamedText(m, c, "assistant");
  }
  // typewriter deltas concatenate verbatim — "f"+"or" stays "for", nothing duplicated
  assert.equal(m.text, "Now draw a house. Maybe a for the walls?");
});

test("a visual arriving mid-turn neither splits nor duplicates the transcript", () => {
  // Mirrors the store's visual_block handler: text stays whole in `text`, the visual is a
  // visual-only element.
  let m = aiMsg();
  m = appendStreamedText(m, "How many of these r", "assistant");
  m = {
    ...m,
    elements: [
      ...(m.elements ?? []),
      { id: "v1", type: "visual", content: "image", meta: { engine: "image" } },
    ],
  };
  m = appendStreamedText(m, "ed cylinders do you see?", "assistant");

  // "red" is not split, and the answer appears exactly once
  assert.equal(m.text, "How many of these red cylinders do you see?");
  // no text elements were created → renderer shows the plain text span (consistent font)
  assert.equal((m.elements ?? []).some((el) => el.type === "text"), false);
  assert.deepEqual((m.elements ?? []).map((el) => el.type), ["visual"]);
});

test("user chunks are space-joined", () => {
  let m = aiMsg({ sender: "user", text: "Ball" });
  m = appendStreamedText(m, "rolls", "user");
  assert.equal(m.text, "Ball rolls");
});

test("a planning bubble is replaced by the first real text, not appended", () => {
  let m = aiMsg({ text: "Thinking...", isPlanning: true });
  m = appendStreamedText(m, "Real answer", "assistant");
  assert.equal(m.text, "Real answer");
  assert.equal(m.isPlanning, false);
});
