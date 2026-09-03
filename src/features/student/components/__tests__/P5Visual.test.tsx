import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

vi.mock("@/utils/p5Loader", () => ({
  getP5Source: () => Promise.resolve("/* p5 stub */"),
}));

import { P5Visual } from "../P5Visual";

const SKETCH = "function setup(){ createCanvas(600, 400); }";

async function renderSketch() {
  const { container } = render(<P5Visual code={SKETCH} />);
  const box = container.firstElementChild as HTMLElement;
  await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
  return { container, box, iframe: container.querySelector("iframe")! };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("P5Visual", () => {
  it("aligns to the start of the message rather than centring itself", async () => {
    // The sketch sits in a left-aligned message; centring it made it read as a
    // detached widget floating away from the text.
    const { box } = await renderSketch();
    expect(box.className).not.toContain("mx-auto");
  });

  it("adopts the aspect ratio the sketch reports", async () => {
    const { box, iframe } = await renderSketch();

    // Default until the sketch reports in.
    expect(box.style.aspectRatio).toBe("1.6 / 1");

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "p5-canvas-size", w: 600, h: 300 },
        source: iframe.contentWindow,
      }),
    );

    await waitFor(() => expect(box.style.aspectRatio).toBe("2 / 1"));
  });

  it("ignores canvas-size messages from any other frame", async () => {
    const { box } = await renderSketch();

    // A sandboxed frame has an opaque origin, so source identity is the only
    // real check — a message from elsewhere must not resize this sketch.
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "p5-canvas-size", w: 600, h: 300 },
        source: window,
      }),
    );

    await new Promise((r) => setTimeout(r, 20));
    expect(box.style.aspectRatio).toBe("1.6 / 1");
  });

  it("ignores nonsense dimensions", async () => {
    const { box, iframe } = await renderSketch();

    for (const bad of [{ w: 0, h: 100 }, { w: 100, h: 0 }, { w: NaN, h: 10 }, { w: -5, h: 10 }]) {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "p5-canvas-size", ...bad },
          source: iframe.contentWindow,
        }),
      );
    }

    await new Promise((r) => setTimeout(r, 20));
    expect(box.style.aspectRatio).toBe("1.6 / 1");
  });

  it("scales the sketch by its CSS size, not its backing buffer", async () => {
    const { iframe } = await renderSketch();
    const srcdoc = iframe.getAttribute("srcdoc") ?? "";

    // p5 sets pixelDensity from devicePixelRatio, so canvas.width is dpr times
    // the size the sketch asked for. Fitting against that shrank every sketch
    // by 1/dpr and left a fat margin around it.
    expect(srcdoc).toContain("canvas.offsetWidth");
    expect(srcdoc).toContain("canvas.offsetHeight");
  });
});
