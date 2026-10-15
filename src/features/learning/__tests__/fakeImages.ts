import { vi } from "vitest";

/**
 * jsdom never fetches or decodes a picture (`new Image()` fires neither `load` nor `error`), so tests that depend on a
 * figure being ready replace `Image` with this deterministic stand-in. By default a picture loads (and decodes) on the
 * next microtask; `hold` keeps matching pictures loading until `release`, and `fail` makes them error. Whether a real
 * browser paints the decoded picture, and when its ink-in runs, is not something this can show.
 */
interface Pending {
  src: string;
  image: FakeImage;
}

const rules = { hold: [] as string[], fail: [] as string[] };
const pending: Pending[] = [];
/** Every picture URL a loader was pointed at, in order. */
export const imageRequests: string[] = [];

const matches = (src: string, list: string[]) => list.some((part) => src.includes(part));

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = "auto";
  private current = "";

  get src() {
    return this.current;
  }

  set src(value: string) {
    this.current = value;
    imageRequests.push(value);
    if (matches(value, rules.hold)) pending.push({ src: value, image: this });
    else if (matches(value, rules.fail)) queueMicrotask(() => this.onerror?.());
    else queueMicrotask(() => this.onload?.());
  }

  decode(): Promise<void> {
    return Promise.resolve();
  }
}

export const fakeImages = {
  install() {
    rules.hold = [];
    rules.fail = [];
    pending.length = 0;
    imageRequests.length = 0;
    vi.stubGlobal("Image", FakeImage);
  },
  uninstall() {
    vi.unstubAllGlobals();
  },
  /** Pictures whose URL contains any of these stay loading until released. */
  hold(...parts: string[]) {
    rules.hold = parts;
  },
  /** Pictures whose URL contains any of these fail to load. */
  fail(...parts: string[]) {
    rules.fail = parts;
  },
  /** Finish loading every held picture whose URL contains `part` (all of them without one); new requests load at once. */
  release(part = "") {
    rules.hold = rules.hold.filter((p) => !p.includes(part) && !part.includes(p));
    for (const entry of pending.splice(0).filter((e) => {
      if (e.src.includes(part)) return true;
      pending.push(e);
      return false;
    })) {
      entry.image.onload?.();
    }
  },
  /** Fail every held picture whose URL contains `part`. */
  failHeld(part = "") {
    rules.hold = rules.hold.filter((p) => !p.includes(part) && !part.includes(p));
    for (const entry of pending.splice(0).filter((e) => {
      if (e.src.includes(part)) return true;
      pending.push(e);
      return false;
    })) {
      entry.image.onerror?.();
    }
  },
};
