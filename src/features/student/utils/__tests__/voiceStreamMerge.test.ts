import { describe, it, expect } from "vitest";
import { appendTranscriptChunk } from "../voiceStreamMerge";

describe("appendTranscriptChunk", () => {
  it("rejoins a word split across two packets", () => {
    // Straight from the websocket frames behind the reported bug:
    //   {"type":"transcript","role":"assistant","content":"Bu"}
    //   {"type":"transcript","role":"assistant","content":"t sometimes"}
    // Joining these with a space produced "Bu t sometimes".
    const chunks = ["Bu", "t sometimes"];
    const text = chunks.reduce(appendTranscriptChunk, "");

    expect(text).toBe("But sometimes");
    // Preserves the spacing the provider already sent.
    expect(["Same idea jus", "t with differen", "t shapes."].reduce(appendTranscriptChunk, "")).toBe(
      "Same idea just with different shapes.",
    );
  });

  it("adds no separator on the first chunk, an empty chunk, or one that brings its own space", () => {
    expect(appendTranscriptChunk("", "Great!")).toBe("Great!");
    expect(appendTranscriptChunk("hello", "")).toBe("hello");
    expect(appendTranscriptChunk("Do you see", " the pattern?")).toBe("Do you see the pattern?");
  });

  it("spaces chunks that land exactly on a word boundary", () => {
    // The reported bug: a session where every chunk was a whole word with no
    // embedded space at all — "read"/"the"/"newspaper" — rendered as
    // "readthenewspaper". Unlike "Bu"/"t sometimes" above, these boundaries
    // ARE word boundaries and need a space neither chunk supplies.
    const chunks = ["He", "can't", "read", "the", "newspaper."];
    const text = chunks.reduce(appendTranscriptChunk, "");

    expect(text).toBe("He can't read the newspaper.");
    // Two- and three-letter chunks that are real words are still spaced.
    const short = ["Can", "you", "guess", "something", "else", "that", "would", "be", "super", "hard", "for", "him", "to", "do?"];
    expect(short.reduce(appendTranscriptChunk, "")).toBe("Can you guess something else that would be super hard for him to do?");
  });

  it("does not space punctuation that attaches to the previous chunk", () => {
    const chunks = ["Let", "'s", "read", "this", ",", "then", "stop", "."];
    const text = chunks.reduce(appendTranscriptChunk, "");

    expect(text).toBe("Let's read this, then stop.");
  });
});
