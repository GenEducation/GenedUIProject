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
  });

  it("preserves the spacing the provider already sent", () => {
    const chunks = ["Same idea jus", "t with differen", "t shapes."];
    const text = chunks.reduce(appendTranscriptChunk, "");

    expect(text).toBe("Same idea just with different shapes.");
    expect(text).not.toContain("jus t");
    expect(text).not.toContain("differen t");
  });

  it("does not inject a separator on the first chunk", () => {
    expect(appendTranscriptChunk("", "Great!")).toBe("Great!");
  });

  it("leaves leading and trailing whitespace inside chunks alone", () => {
    // A chunk that already carries its own space is never given a second one.
    expect(appendTranscriptChunk("keeps goin", "g like that.")).toBe("keeps going like that.");
    expect(appendTranscriptChunk("Do you see", " the pattern?")).toBe("Do you see the pattern?");
  });

  it("handles an empty chunk without altering the buffer", () => {
    expect(appendTranscriptChunk("hello", "")).toBe("hello");
  });

  it("spaces chunks that land exactly on a word boundary", () => {
    // The reported bug: a session where every chunk was a whole word with no
    // embedded space at all — "read"/"the"/"newspaper" — rendered as
    // "readthenewspaper". Unlike "Bu"/"t sometimes" above, these boundaries
    // ARE word boundaries and need a space neither chunk supplies.
    const chunks = ["He", "can't", "read", "the", "newspaper."];
    const text = chunks.reduce(appendTranscriptChunk, "");

    expect(text).toBe("He can't read the newspaper.");
  });

  it("still spaces two- and three-letter chunks that are real words", () => {
    const chunks = ["Can", "you", "guess", "something", "else", "that", "would", "be", "super", "hard", "for", "him", "to", "do?"];
    const text = chunks.reduce(appendTranscriptChunk, "");

    expect(text).toBe("Can you guess something else that would be super hard for him to do?");
  });

  it("does not space punctuation that attaches to the previous chunk", () => {
    const chunks = ["Let", "'s", "read", "this", ",", "then", "stop", "."];
    const text = chunks.reduce(appendTranscriptChunk, "");

    expect(text).toBe("Let's read this, then stop.");
  });
});
