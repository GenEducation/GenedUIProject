import { describe, it, expect } from "vitest";
import { listenButtons, tutorButtons, type ListenButtonsState, type TutorButtonsState } from "../reading/bookActions";

const tutor = (over: Partial<TutorButtonsState> = {}): TutorButtonsState => ({
  role: "reading", contentPhase: null, questionOpen: false, hasText: true, replying: false, voice: false,
  pressed: { readWithMe: false, readIt: false }, ...over,
});
const shown = (b: ReturnType<typeof tutorButtons>) => [b.readWithMe?.label ?? null, b.readIt ? "I've read it" : null].filter(Boolean);

describe("tutorButtons: Read with your tutor", () => {
  it.each([
    ["a reading step shows both", tutor(), ["Read with me", "I've read it"]],
    ["a mixed step shows both", tutor({ role: "mixed" }), ["Read with me", "I've read it"]],
    ["a post-reading step only says it was read", tutor({ role: "post_reading" }), ["I've read it"]],
    ["a pre-reading step shows neither", tutor({ role: "pre_reading" }), []],
    ["a chapter with no passages shows neither", tutor({ role: null, hasText: false }), []],
    ["a content-led lesson shows neither", tutor({ contentPhase: "teaching" }), []],
    ["a question on screen hides both", tutor({ questionOpen: true }), []],
    ["a voice session hides both", tutor({ voice: true }), []],
    ["after reading together, it reads on", tutor({ pressed: { readWithMe: true, readIt: false } }), ["Keep reading with me", "I've read it"]],
    ["\"I've read it\" is said once per part", tutor({ pressed: { readWithMe: false, readIt: true } }), ["Read with me"]],
  ])("%s", (_, state, expected) => {
    expect(shown(tutorButtons(state))).toEqual(expected);
  });

  it("a streaming reply disables, never hides, so the row does not jump", () => {
    const b = tutorButtons(tutor({ replying: true }));
    expect(b.readWithMe?.disabled).toBe(true);
    expect(b.readIt?.disabled).toBe(true);
  });
});

const listen = (over: Partial<ListenButtonsState> = {}): ListenButtonsState => ({
  audible: true, voice: false, phase: "idle", canCapture: true, hasExcerpt: true, practising: false, ...over,
});

describe("listenButtons: Listen & practise", () => {
  it.each([
    ["idle: Listen and practice", listen(), { main: "Listen", stop: false, again: false, practice: true }],
    ["loading: one disabled button", listen({ phase: "loading" }), { main: "Getting it ready…", stop: false, again: false, practice: false }],
    ["playing: Pause, Stop, Again", listen({ phase: "playing" }), { main: "Pause", stop: true, again: true, practice: false }],
    ["paused: Keep listening, Stop, Again", listen({ phase: "paused" }), { main: "Keep listening", stop: true, again: true, practice: false }],
    ["no microphone: no practice", listen({ canCapture: false }), { main: "Listen", stop: false, again: false, practice: false }],
    ["no sentences: no practice", listen({ hasExcerpt: false }), { main: "Listen", stop: false, again: false, practice: false }],
  ])("%s", (_, state, expected) => {
    const b = listenButtons(state);
    expect(b.shown).toBe(true);
    expect({ main: b.main?.label, stop: b.stop, again: b.again, practice: b.practice }).toEqual(expected);
  });

  it("loading cannot be pressed", () => {
    expect(listenButtons(listen({ phase: "loading" })).main?.disabled).toBe(true);
  });

  it.each([
    ["an unknown language", listen({ audible: false })],
    ["a voice session", listen({ voice: true })],
  ])("hides the whole group for %s", (_, state) => {
    expect(listenButtons(state)).toMatchObject({ shown: false, main: null, practice: false });
  });

  it("open practice takes the group over", () => {
    expect(listenButtons(listen({ practising: true }))).toEqual({ shown: true, main: null, stop: false, again: false, practice: false });
  });
});
