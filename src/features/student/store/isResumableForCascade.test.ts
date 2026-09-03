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

  // Push-to-talk was excluded until the cascade had a forced-listening mode. It has one
  // now on both sides -- speechPipelineService.startPushToTalk bypasses the worklet's
  // onset detection, and core_service/voice/pipeline/endpointer.py arbitrates the turn
  // from press/release -- so PTT children no longer get routed to the legacy path.
  it("is true in push-to-talk mode -- the cascade has forced listening now", () => {
    expect(isResumableForCascade(makeChat(), true)).toBe(true);
  });

  // core_service/voice/pipeline/router.py now drives the entry conversation itself
  // (entry_turn.run_entry_turn) when no chapter is resolved yet, so these three used to
  // fall back to the legacy Gemini Live path are cold-start cases the cascade now
  // supports end-to-end.
  it("is true with no resolved chapter -- the cascade now runs entry/RAG/ZPD itself", () => {
    expect(isResumableForCascade(makeChat({ chapter_name: undefined }), false)).toBe(true);
  });

  it("is true for a brand-new session (id 'new') -- a cold start", () => {
    expect(isResumableForCascade(makeChat({ id: "new" }), false)).toBe(true);
  });

  it("is true for a brand-new focused session (id 'new-focused') -- a cold start", () => {
    expect(isResumableForCascade(makeChat({ id: "new-focused" }), false)).toBe(true);
  });
});
