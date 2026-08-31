import { describe, expect, it } from "vitest";

import { isResumableForCascade } from "./useStudentStore";
import type { ChatSession } from "./useStudentStore";

function makeChat(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: "abc-123",
    title: "Fractions",
    agentType: "Socratic Tutor",
    agentIcon: "🤖",
    lastActive: "Just now",
    lastTopic: "Fractions",
    chapter_name: "Fractions",
    ...overrides,
  };
}

describe("isResumableForCascade", () => {
  it("is true for an existing session with a resolved chapter, hands-free", () => {
    expect(isResumableForCascade(makeChat(), false)).toBe(true);
  });

  it("is false in push-to-talk mode -- the mic worklet has no forced-listen mode yet", () => {
    expect(isResumableForCascade(makeChat(), true)).toBe(false);
  });

  it("is false with no resolved chapter -- the cascade has no entry flow", () => {
    expect(isResumableForCascade(makeChat({ chapter_name: undefined }), false)).toBe(false);
  });

  it("is false for a brand-new session (id 'new')", () => {
    expect(isResumableForCascade(makeChat({ id: "new" }), false)).toBe(false);
  });

  it("is false for a brand-new focused session (id 'new-focused')", () => {
    expect(isResumableForCascade(makeChat({ id: "new-focused" }), false)).toBe(false);
  });
});
