import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePetExpression } from "../usePetExpression";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useTestStore } from "@/features/student/store/useTestStore";
import { usePetStore } from "@/features/student/store/usePetStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { EMPTY_TALLY } from "../../utils/petEvents";
import { PET_EMOTIONS } from "../../theme/petExpressions";
import { AWAIT_REPLY_MS } from "../usePetExpression";
import type { SubmitTestResponse } from "@/features/student/types/test";

const setStats = (currentStreak: number, longestStreak: number) =>
  act(() => {
    useStudentStore.setState({ studentStats: { currentStreak, longestStreak, totalSessions: 0 } });
  });

/** A fetch landing, or a later change once one has. */
const setUnread = (unreadCount: number) =>
  act(() => {
    useNotificationStore.setState({ unreadCount, hasFetched: true });
  });

const frame = (emotion: string, seq: number) =>
  act(() => {
    usePetStore.getState().ingestPetFrame({ type: "pet_emotion", emotion, cause: "test", seq }, "chat:t");
  });

beforeEach(() => {
  vi.spyOn(console, "debug").mockImplementation(() => {});
  try {
    localStorage.clear();
  } catch {
    /* jsdom without storage */
  }
  act(() => {
    useStudentStore.setState({
      studentStats: null,
      isAITyping: false,
      voiceSessionStatus: "idle",
      isMuted: false,
      pttHeld: false,
      connectionQuality: null,
      messages: [],
    });
    useTestStore.setState({ testResult: null, currentTest: null, isSubmitting: false });
    useNotificationStore.setState({ unreadCount: 0, hasFetched: false });
    usePetStore.setState({
      petBurst: null,
      petLastSeenStreak: null,
      lastSeqBySession: {},
      damper: {},
      widgetTally: EMPTY_TALLY,
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePetExpression — triggers that watch a number change", () => {
  /**
   * The defect most likely to ship unnoticed. On mount both signals jump from
   * nothing to their real value; compared naively against 0 that is an
   * "increase", and the buddy would celebrate every time the app loads.
   */
  it("does NOT react to the first observation of an existing streak", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(7, 7); // first fetch lands — a 7-day streak the student already had
    expect(result.current).toBe("idle");
  });

  it("does NOT react to the first observation of existing unread notifications", () => {
    const { result } = renderHook(() => usePetExpression());
    setUnread(5);
    expect(result.current).toBe("idle");
  });

  it("celebrates a streak milestone", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(2, 30); // seeds
    setStats(3, 30);
    expect(result.current).toBe("celebration");
  });

  it("is excited by an ordinary streak increase", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(4, 30);
    setStats(5, 30);
    expect(result.current).toBe("excited");
  });

  it("does not react to a lost streak", () => {
    const { result } = renderHook(() => usePetExpression());
    setStats(7, 7);
    setStats(0, 7);
    expect(result.current).toBe("idle");
  });

  it("notices a streak gained since the last visit on this device", () => {
    act(() => { usePetStore.setState({ petLastSeenStreak: 6 }); });
    const { result } = renderHook(() => usePetExpression());
    setStats(7, 7); // first observation this session, but 6 was remembered
    expect(result.current).toBe("celebration");
  });

  it("notices when a notification genuinely arrives", () => {
    const { result } = renderHook(() => usePetExpression());
    setUnread(2);
    setUnread(3);
    expect(result.current).toBe("noticing");
  });

  it("does not notice again inside the cooldown", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePetExpression());
    setUnread(1);
    setUnread(2);
    expect(result.current).toBe("noticing");
    act(() => { vi.advanceTimersByTime(3000); });
    setUnread(3);
    expect(result.current).toBe("idle");
  });

  it("ignores notifications being read (the count falling)", () => {
    const { result } = renderHook(() => usePetExpression());
    setUnread(4);
    setUnread(1);
    expect(result.current).toBe("idle");
  });
});

describe("usePetExpression — backend frames and precedence", () => {
  it("shows the emotion a backend frame sends, for its hold", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePetExpression());
    frame("proud", 1);
    expect(result.current).toBe("proud");
    const hold = PET_EMOTIONS.proud.holdMs!;
    act(() => { vi.advanceTimersByTime(hold - 50); });
    expect(result.current).toBe("proud");
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe("idle");
  });

  it("a notification does not cut a celebration short", () => {
    const { result } = renderHook(() => usePetExpression());
    frame("celebration", 1);
    setUnread(1);
    setUnread(2);
    expect(result.current).toBe("celebration");
  });

  it("a newer performance burst replaces an older one", () => {
    const { result } = renderHook(() => usePetExpression());
    frame("curious", 1);
    frame("supportive", 2);
    expect(result.current).toBe("supportive");
  });

  it("maps test verdicts", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => {
      useTestStore.setState({
        testResult: { submission_id: "s1", overall_verdict: "ABOVE" } as unknown as SubmitTestResponse,
      });
    });
    expect(result.current).toBe("celebration");
  });

  it("a burst outranks the tutor talking", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active", isAITyping: true }); });
    expect(result.current).toBe("speaking");
    frame("cheer", 1);
    expect(result.current).toBe("cheer");
  });
});

describe("usePetExpression — voice: the tutor thinking", () => {
  const childSays = (text: string, id = "u1") =>
    act(() => {
      useStudentStore.setState({
        messages: [{ id, text, sender: "user", timestamp: "" }],
      });
    });
  const tutor = (msg: Partial<import("@/features/student/store/useStudentStore").ChatMessage>, isAITyping = true) =>
    act(() => {
      useStudentStore.setState((s) => ({
        isAITyping,
        messages: [...s.messages, { id: "a1", text: "", sender: "ai", timestamp: "", ...msg }],
      }));
    });

  it("thinks from the child's words until the tutor's words start", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active" }); });
    childSays("Is it twelve?");
    expect(result.current).toBe("thinking");
    tutor({ text: "Yes! Twelve." });
    expect(result.current).toBe("speaking");
  });

  it("thinks through the tutor's planning bubble instead of looking like it speaks", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active" }); });
    childSays("Why is the sky blue?");
    tutor({ text: "Thinking...", isPlanning: true });
    expect(result.current).toBe("thinking");
  });

  it("keeps thinking when a status frame clears isAITyping mid-think", () => {
    // The reported bug: the pet dropped to idle while the tutor was thinking.
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active" }); });
    childSays("Why is the sky blue?");
    tutor({ text: "Thinking...", isPlanning: true });
    act(() => { useStudentStore.setState({ isAITyping: false }); });
    expect(result.current).toBe("thinking");
  });

  it("thinks through a tool status that has no words yet", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active" }); });
    childSays("Show me a triangle");
    tutor({ text: "", toolStatus: "Drawing..." });
    expect(result.current).toBe("thinking");
  });

  it("stops thinking if no reply comes (a barge-in drops it)", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active" }); });
    childSays("Is it twelve?");
    act(() => { vi.advanceTimersByTime(AWAIT_REPLY_MS + 50); });
    expect(result.current).toBe("idle");
  });

  it("in push-to-talk, the pause after letting go is thinking, not muted", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active", isMuted: true, pttHeld: false }); });
    childSays("Twelve");
    expect(result.current).toBe("thinking");
  });

  it("does not think in text chat off the back of the student's message", () => {
    const { result } = renderHook(() => usePetExpression());
    childSays("hello");
    expect(result.current).toBe("idle");
  });
});

describe("usePetExpression — voice presence", () => {
  it("speaking outranks muted and thinking", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active", isMuted: true, isAITyping: true }); });
    expect(result.current).toBe("speaking");
  });

  it("is muted when the session is live and the mic is off", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active", isMuted: true }); });
    expect(result.current).toBe("muted");
  });

  it("holding push-to-talk is listening", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active", isMuted: true, pttHeld: true }); });
    expect(result.current).toBe("listening");
  });

  it("a poor connection is reconnecting", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ voiceSessionStatus: "active", connectionQuality: "poor" }); });
    expect(result.current).toBe("reconnecting");
  });

  it("the tutor generating in text chat is thinking, not speaking", () => {
    const { result } = renderHook(() => usePetExpression());
    act(() => { useStudentStore.setState({ isAITyping: true }); });
    expect(result.current).toBe("thinking");
  });
});
