import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  COALESCE_MS,
  EMPTY_TALLY,
  LOCAL_SOURCES,
  SUPPORTIVE_COOLDOWN_MS,
  acceptSeq,
  fromStreakChange,
  fromTestVerdict,
  fromWidgetResult,
  parsePetFrame,
  passDamper,
  type WidgetTally,
} from "./petEvents";
import { usePetStore } from "../store/usePetStore";
import { PET_EMOTIONS, type PetEmotion } from "../theme/petExpressions";

describe("parsePetFrame", () => {
  it("accepts a pet_emotion frame", () => {
    expect(
      parsePetFrame({ type: "pet_emotion", emotion: "proud", cause: "ledger.recovered", seq: 4, turn_id: "t1" }),
    ).toEqual({ type: "pet_emotion", emotion: "proud", cause: "ledger.recovered", seq: 4, turn_id: "t1" });
  });

  it("drops an emotion this build does not know", () => {
    expect(parsePetFrame({ type: "pet_emotion", emotion: "bored", cause: "x", seq: 1 })).toBeNull();
  });

  it("accepts every emotion the backend sends, and has a face for each", () => {
    // MVP docs/pet-emotions-frontend-integration.md, `PetEmotionFrame.emotion`.
    // v3 handoff: twelve reactions (docs/pet-emotions-v3-frontend-handoff.md).
    const sent = [
      "cheer", "encouraging", "supportive", "patient", "curious", "confused",
      "apologetic", "amused", "impressed", "proud", "excited", "celebration",
    ];
    for (const emotion of sent) {
      expect(parsePetFrame({ type: "pet_emotion", emotion, cause: `jev.tutor_reaction.${emotion}`, seq: 1 })).not.toBeNull();
      expect(PET_EMOTIONS[emotion as PetEmotion]?.face).toBeDefined();
    }
  });

  it("drops the emotions retired when the pet went positive-only", () => {
    for (const emotion of ["correct", "incorrect", "sad", "happy"]) {
      expect(parsePetFrame({ type: "pet_emotion", emotion, cause: "x", seq: 1 })).toBeNull();
    }
  });

  it("drops frames without a numeric seq", () => {
    expect(parsePetFrame({ type: "pet_emotion", emotion: "cheer", cause: "x" })).toBeNull();
  });

  it("parses answer_graded", () => {
    expect(parsePetFrame({ type: "answer_graded", correct: true, burst: false, seq: 2 })).toMatchObject({
      type: "answer_graded",
      correct: true,
    });
  });

  it("ignores every other stream event", () => {
    expect(parsePetFrame({ type: "chunk", text: "hi", seq: 1 })).toBeNull();
    expect(parsePetFrame(null)).toBeNull();
  });
});

describe("acceptSeq", () => {
  it("drops a replay at or below the last applied seq", () => {
    let r = acceptSeq({}, "chat:a", 5);
    expect(r.accept).toBe(true);
    r = acceptSeq(r.lastSeqBySession, "chat:a", 5);
    expect(r.accept).toBe(false);
    r = acceptSeq(r.lastSeqBySession, "chat:a", 3);
    expect(r.accept).toBe(false);
    r = acceptSeq(r.lastSeqBySession, "chat:a", 6);
    expect(r.accept).toBe(true);
  });

  it("keeps a separate high-water mark per session", () => {
    const r = acceptSeq({ "chat:a": 40 }, "voice:b", 1);
    expect(r.accept).toBe(true);
    expect(r.lastSeqBySession).toEqual({ "chat:a": 40, "voice:b": 1 });
  });
});

describe("passDamper", () => {
  it("coalesces the same emotion inside the window", () => {
    const a = passDamper({}, "cheer", 1000);
    expect(a.pass).toBe(true);
    expect(passDamper(a.lastAt, "cheer", 1000 + COALESCE_MS - 1).pass).toBe(false);
    expect(passDamper(a.lastAt, "cheer", 1000 + COALESCE_MS).pass).toBe(true);
  });

  it("lets a different emotion through immediately", () => {
    const a = passDamper({}, "cheer", 1000);
    expect(passDamper(a.lastAt, "curious", 1001).pass).toBe(true);
  });

  it("holds Supportive to once a minute", () => {
    const a = passDamper({}, "supportive", 0);
    expect(passDamper(a.lastAt, "supportive", COALESCE_MS + 1).pass).toBe(false);
    expect(passDamper(a.lastAt, "supportive", SUPPORTIVE_COOLDOWN_MS).pass).toBe(true);
  });
});

describe("fromWidgetResult", () => {
  const answer = (t: WidgetTally, directiveId: string, isCorrect: boolean, attempts?: number) =>
    fromWidgetResult(t, { directiveId, isCorrect, attempts });

  it("maps a first-try answer to cheer / encouraging", () => {
    expect(answer(EMPTY_TALLY, "d1", true).emotion).toBe("cheer");
    expect(answer(EMPTY_TALLY, "d1", false).emotion).toBe("encouraging");
  });

  it("is Supportive on the second wrong in a row", () => {
    const a = answer(EMPTY_TALLY, "d1", false);
    expect(answer(a.tally, "d2", false).emotion).toBe("supportive");
  });

  it("is Proud when a retry of the same directive comes good", () => {
    const a = answer(EMPTY_TALLY, "d1", false);
    expect(answer(a.tally, "d1", true).emotion).toBe("proud");
  });

  it("trusts the backend's attempts count too", () => {
    expect(answer(EMPTY_TALLY, "d9", true, 2).emotion).toBe("proud");
  });

  it("is Excited at a 3-in-a-row correctness streak", () => {
    let t = EMPTY_TALLY;
    t = answer(t, "a", true).tally;
    t = answer(t, "b", true).tally;
    expect(answer(t, "c", true).emotion).toBe("excited");
  });

  it("a wrong answer breaks the streak", () => {
    let t = EMPTY_TALLY;
    t = answer(t, "a", true).tally;
    t = answer(t, "b", true).tally;
    t = answer(t, "c", false).tally;
    expect(answer(t, "d", true).emotion).toBe("cheer");
  });
});

describe("fromTestVerdict", () => {
  it("maps each verdict", () => {
    expect(fromTestVerdict("ABOVE")).toBe("celebration");
    expect(fromTestVerdict("AT")).toBe("cheer");
    expect(fromTestVerdict("BELOW")).toBe("supportive");
    expect(fromTestVerdict(null)).toBeNull();
  });
});

describe("fromStreakChange", () => {
  it("fires nothing without a previous value", () => {
    expect(fromStreakChange(null, 7)).toBeNull();
  });

  it("celebrates a milestone, including one crossed rather than landed on", () => {
    expect(fromStreakChange(2, 3)).toBe("celebration");
    expect(fromStreakChange(5, 8)).toBe("celebration");
  });

  it("is Excited for an ordinary increase", () => {
    expect(fromStreakChange(4, 5)).toBe("excited");
  });

  it("fires nothing when the streak is lost — the pet is positive-only", () => {
    expect(fromStreakChange(7, 0)).toBeNull();
  });

  it("ignores no change", () => {
    expect(fromStreakChange(5, 5)).toBeNull();
  });
});

describe("usePetStore ingest", () => {
  beforeEach(() => {
    usePetStore.setState({ petBurst: null, lastSeqBySession: {}, damper: {}, widgetTally: EMPTY_TALLY });
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    LOCAL_SOURCES.interactive = true;
  });

  it("fires the backend emotion as-is", () => {
    usePetStore.getState().ingestPetFrame(
      { type: "pet_emotion", emotion: "celebration", cause: "milestone.lesson_done", seq: 1 },
      "chat:s1",
    );
    expect(usePetStore.getState().petBurst).toMatchObject({
      emotion: "celebration",
      source: "backend:milestone.lesson_done",
    });
  });

  it("never fires an emotion for answer_graded, but advances seq", () => {
    usePetStore.getState().ingestPetFrame({ type: "answer_graded", correct: true, burst: false, seq: 3 }, "chat:s1");
    expect(usePetStore.getState().petBurst).toBeNull();
    // A replayed pet_emotion below that seq is now dropped.
    usePetStore.getState().ingestPetFrame({ type: "pet_emotion", emotion: "happy", cause: "x", seq: 2 }, "chat:s1");
    expect(usePetStore.getState().petBurst).toBeNull();
  });

  it("ignores an emotion from a newer backend: no burst, no crash, no guessed face", () => {
    // v3 handoff: protects this build from roster additions it has not shipped.
    expect(() =>
      usePetStore.getState().ingestPetFrame({ type: "pet_emotion", emotion: "flabbergasted", cause: "jev.x", seq: 50 }, "chat:s9"),
    ).not.toThrow();
    expect(usePetStore.getState().petBurst).toBeNull();
  });

  it("does not re-fire a frame replayed after a reconnect", () => {
    const frame = { type: "pet_emotion", emotion: "cheer", cause: "jev.tutor_reaction.cheer", seq: 9 };
    usePetStore.getState().ingestPetFrame(frame, "voice:v1");
    const first = usePetStore.getState().petBurst?.id;
    // Past the coalesce window, so only the seq check can stop it.
    usePetStore.setState({ damper: {} });
    usePetStore.getState().ingestPetFrame(frame, "voice:v1");
    expect(usePetStore.getState().petBurst?.id).toBe(first);
  });

  it("widget answers are a local source that can be switched off", () => {
    usePetStore.getState().recordWidgetAnswer({ directiveId: "d1", isCorrect: true });
    expect(usePetStore.getState().petBurst?.source).toBe("local:interactive");

    usePetStore.setState({ petBurst: null, damper: {} });
    LOCAL_SOURCES.interactive = false;
    usePetStore.getState().recordWidgetAnswer({ directiveId: "d2", isCorrect: true });
    expect(usePetStore.getState().petBurst).toBeNull();
  });
});
