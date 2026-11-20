import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bindStepperKeys, registerStepper, step, stepperState } from "../engine/stepper.js";

const STOPS = [0, 600, 1500, 2400];
let undo: () => void = () => {};
let unbind: () => void = () => {};

function setScroll(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
  setScroll(0);
  Object.defineProperty(document.documentElement, "scrollHeight", { value: 5000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  window.scrollTo = vi.fn(((opts: ScrollToOptions) => setScroll(opts.top ?? 0)) as typeof window.scrollTo);
  undo = registerStepper({ stops: () => STOPS });
  unbind = bindStepperKeys();
});
afterEach(() => {
  undo();
  unbind();
  vi.useRealTimers();
});

const press = (key: string, target: EventTarget = document.body) => {
  const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  vi.advanceTimersByTime(1000);
  return e;
};

describe("marketing stepper", () => {
  it("↓ goes to the next step and ↑ back", () => {
    expect(press("ArrowDown").defaultPrevented).toBe(true);
    expect(window.scrollY).toBe(600);
    press("ArrowDown");
    expect(window.scrollY).toBe(1500);
    press("ArrowUp");
    expect(window.scrollY).toBe(600);
  });

  it("goes on from a step in flight, so quick presses don't repeat one", () => {
    window.scrollTo = vi.fn(); // the glide hasn't moved the page yet
    step(1);
    step(1);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 1500, behavior: "smooth" });
  });

  it("reports when there is no next step, and leaves the key alone there", () => {
    setScroll(2400);
    expect(stepperState()).toMatchObject({ ready: true, hasNext: false, hasPrev: true });
    expect(press("ArrowDown").defaultPrevented).toBe(false);
  });

  it("leaves the arrows to text fields and modified keys", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    expect(press("ArrowDown", input).defaultPrevented).toBe(false);
    expect(window.scrollY).toBe(0);
    const e = new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    input.remove();
  });

  it("stays out of the way until the page is ready", () => {
    undo();
    undo = registerStepper({ stops: () => STOPS, ready: () => false });
    expect(stepperState().ready).toBe(false);
    expect(press("ArrowDown").defaultPrevented).toBe(false);
  });
});
