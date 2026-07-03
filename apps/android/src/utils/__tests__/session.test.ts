import { isVoiceSession, buildSessionRoute } from "../session";
import type { ChatSession } from "../../types/api";

describe("isVoiceSession", () => {
  it("is true for voice/device source or voice chat_mode", () => {
    expect(isVoiceSession({ source: "voice" })).toBe(true);
    expect(isVoiceSession({ source: "device" })).toBe(true);
    expect(isVoiceSession({ chat_mode: "voice" })).toBe(true);
  });

  it("is false for chat-origin sessions and nullish input", () => {
    expect(isVoiceSession({ source: "chat" })).toBe(false);
    expect(isVoiceSession({})).toBe(false);
    expect(isVoiceSession(null)).toBe(false);
    expect(isVoiceSession(undefined)).toBe(false);
  });
});

describe("buildSessionRoute", () => {
  it("routes voice sessions to /voice-chat and carries session fields", () => {
    const s: Partial<ChatSession> = {
      session_id: "s1",
      source: "voice",
      subject: "science",
      grade: 7,
      agent_id: "a1",
    };
    expect(buildSessionRoute(s)).toEqual({
      pathname: "/voice-chat",
      params: { sessionId: "s1", subject: "science", grade: "7", agentId: "a1" },
    });
  });

  it("routes chat sessions to /chat and omits agentId when absent", () => {
    const route = buildSessionRoute({ session_id: "s2", subject: "english", grade: 5 });
    expect(route.pathname).toBe("/chat");
    expect(route.params).toEqual({ sessionId: "s2", subject: "english", grade: "5" });
    expect("agentId" in route.params).toBe(false);
  });

  it("applies subject/grade fallbacks when the session lacks them", () => {
    const route = buildSessionRoute({ session_id: "s3" }, "mathematics", 9);
    expect(route.params.subject).toBe("mathematics");
    expect(route.params.grade).toBe("9");
  });
});
