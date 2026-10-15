import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom lacks layout APIs that the SVG/DnD widgets call. Provide inert stubs so
// component mounts don't throw.
afterEach(() => cleanup());

if (!(globalThis as any).localStorage || typeof (globalThis as any).localStorage.getItem !== "function") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!(window as any).matchMedia) {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

// SVGElement.getBoundingClientRect → deterministic box so pointer-to-value math
// in NumberLine/CoordinatePlane/etc. is testable.
if (typeof Element !== "undefined") {
  Element.prototype.getBoundingClientRect =
    Element.prototype.getBoundingClientRect ||
    (() => ({ x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 70, width: 320, height: 70, toJSON: () => ({}) }) as DOMRect);
}

// The maths field is MathLive, which needs a real browser (layout, fonts, custom elements). In tests it is a plain box
// that holds the field's LaTeX, so a test types what MathLive would hold (`2x+\frac{3}{4}`) and Enter still sends.
vi.mock("@/features/learning/math/MathField", async () => {
  const React = await import("react");
  const MathField = React.forwardRef<
    { focus: () => void; insertText: (t: string) => void },
    { value: string; onChange: (v: string) => void; onEnter?: () => void; placeholder?: string; disabled?: boolean; ariaLabel: string }
  >(function MathField({ value, onChange, onEnter, placeholder, disabled, ariaLabel }, ref) {
    const input = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => ({ focus: () => input.current?.focus(), insertText: (t) => onChange(value + t) }));
    return React.createElement("input", {
      ref: input,
      "aria-label": ariaLabel,
      value,
      placeholder,
      disabled,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      onKeyDown: (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEnter?.(); }
      },
    });
  });
  return { MathField };
});
