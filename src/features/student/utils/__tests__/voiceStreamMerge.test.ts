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
    // The provider decides where spaces go; the buffer must not second-guess it.
    expect(appendTranscriptChunk("keeps goin", "g like that.")).toBe("keeps going like that.");
    expect(appendTranscriptChunk("Do you see", " the pattern?")).toBe("Do you see the pattern?");
  });

  it("handles an empty chunk without altering the buffer", () => {
    expect(appendTranscriptChunk("hello", "")).toBe("hello");
  });
});
