import { render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContinueLearningCard, replayHeroIntro } from "../ContinueLearningCard";
import { heroScene } from "../../theme/heroScenes";

const session = { title: "A Bottle of Dew", mastery: 10, vis: { label: "English", color: "#2A6E22" } };

/** A ResizeObserver that reports one desktop-sized box straight away, so the progress layer gets placed. */
function observeBox(width: number, height: number) {
  const RO = class {
    constructor(private cb: ResizeObserverCallback) {}
    observe() {
      this.cb([{ contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  };
  vi.stubGlobal("ResizeObserver", RO);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("hero scenes", () => {
  it("gives English, Mathematics and Science their own scene, and the rest the tide", () => {
    expect(heroScene("English")?.key).toBe("english");
    expect(heroScene("Mathematics")?.key).toBe("mathematics");
    expect(heroScene("Science")?.key).toBe("science");
    expect(heroScene("History")).toBeNull();
    expect(heroScene(undefined)).toBeNull();
  });
});

describe("ContinueLearningCard", () => {
  it("shows the subject's own scene and its progress, placed over it", async () => {
    observeBox(1200, 340);
    const { container } = render(
      <ContinueLearningCard session={session} subject="English" steps={{ done: 10, total: 19 }} onStart={() => {}} />,
    );
    await act(async () => {});
    expect(container.querySelector("img")?.getAttribute("src")).toContain("/student/hero/english/scene-1440.webp");
    const layer = screen.getByTestId("hero-progress");
    expect(layer.style.backgroundImage).toContain("/student/hero/english/progress.webp");
    expect(Number.parseFloat(layer.style.width)).toBeGreaterThan(0);
  });

  it("keeps the tide for other subjects, with no progress layer", async () => {
    observeBox(1200, 340);
    const { container } = render(
      <ContinueLearningCard session={{ ...session, vis: { label: "History", color: "#000" } }} subject="History" onStart={() => {}} />,
    );
    await act(async () => {});
    expect(container.querySelector("img")?.getAttribute("src")).toContain("/student/hero/tide-1440.webp");
    expect(screen.queryByTestId("hero-progress")).toBeNull();
  });

  it("shows the journey finished, whatever the student's progress, once the intro has played", async () => {
    observeBox(1200, 340);
    // the first card of the page load plays the intro; a later one (back on the dashboard) shows the result at once
    render(<ContinueLearningCard session={session} subject="Mathematics" steps={{ done: 2, total: 19 }} onStart={() => {}} />).unmount();
    render(<ContinueLearningCard session={session} subject="Mathematics" steps={{ done: 3, total: 19 }} onStart={() => {}} />);
    await act(async () => {});
    const scene = heroScene("Mathematics")!;
    // the picture's journey always ends complete; the bar keeps the real count
    expect(screen.getByTestId("hero-progress").dataset.state).toBe(String(scene.progress.states - 1));
    expect(screen.getByText(/3 of 19 steps/)).toBeTruthy();
  });

  it("shows the video's first frame and the text at once while the video downloads", async () => {
    observeBox(1200, 340);
    // a desktop width, motion allowed; the video never finishes downloading here: the card must not wait on it
    const mm = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({ ...mm(q), matches: q.includes("min-width") }));
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    replayHeroIntro();
    render(<ContinueLearningCard session={session} subject="Science" steps={{ done: 3, total: 19 }} onStart={() => {}} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const still = screen.getByTestId("hero-start");
    expect(still.getAttribute("src")).toContain("/student/hero/science/start-1440.webp");
    expect(still.style.opacity).toBe("1");
    expect(screen.getByText(session.title).style.opacity).toBe("1");
    expect(screen.getByRole("button", { name: /continue/i })).toBeTruthy();
  });

  it("plays the entrance again after a lesson, and not on other visits", async () => {
    observeBox(1200, 340);
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    replayHeroIntro();
    render(<ContinueLearningCard session={session} subject="English" onStart={() => {}} />).unmount();
    // back on the dashboard from another page: the finished scene, no entrance
    const { unmount } = render(<ContinueLearningCard session={session} subject="English" onStart={() => {}} />);
    expect(screen.queryByTestId("hero-start")).toBeNull();
    unmount();
    // back from a lesson (the lesson page calls replayHeroIntro): the entrance again
    replayHeroIntro();
    render(<ContinueLearningCard session={session} subject="English" onStart={() => {}} />);
    expect(screen.getByTestId("hero-start")).toBeTruthy();
  });
});
