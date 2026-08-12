import { describe, expect, it } from "vitest";

import {
  isCompatibleVoiceSessionId,
  promoteTemporaryVoiceSession,
} from "../sessionIdentity";

describe("voice session identity", () => {
  it("promotes id, session_id, and cache ownership atomically", () => {
    const messages = [{ id: "entry-1" }];
    const promoted = promoteTemporaryVoiceSession(
      { id: "new", title: "Tutor" },
      messages,
      { new: messages, older: [{ id: "old" }] },
      "canonical-id",
    );

    expect(promoted.activeChat).toMatchObject({
      id: "canonical-id",
      session_id: "canonical-id",
    });
    expect(promoted.cache.new).toBeUndefined();
    expect(promoted.cache["canonical-id"]).toBe(messages);
    expect(promoted.cache.older).toEqual([{ id: "old" }]);
  });

  it("rejects promotion of an already canonical conversation", () => {
    expect(() =>
      promoteTemporaryVoiceSession({ id: "first-id" }, [], {}, "second-id"),
    ).toThrow("Only a temporary voice conversation can be promoted");
  });

  it("accepts repeat announcements but rejects identity replacement", () => {
    expect(
      isCompatibleVoiceSessionId(
        { id: "canonical-id", session_id: "canonical-id" },
        "canonical-id",
      ),
    ).toBe(true);
    expect(
      isCompatibleVoiceSessionId(
        { id: "canonical-id", session_id: "canonical-id" },
        "different-id",
      ),
    ).toBe(false);
  });
});
