import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StudyDeckLoader } from "../StudyDeckLoader";
import { STUDY_OBJECTS, COMPLETION_OBJECT } from "../studyObjects";

const motionPref = vi.hoisted(() => ({ reduce: false }));
vi.mock("framer-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("framer-motion")>()),
  useReducedMotion: () => motionPref.reduce,
}));

afterEach(() => {
  motionPref.reduce = false;
});

// Short deck for tests; the real one is a full cycle (~4.5s).
const CYCLE = 300;

describe("StudyDeckLoader handoff", () => {
  it("navigates under the overlay right away, and never leaves while the hand-off is open", async () => {
    const onCelebrated = vi.fn();
    const onFinished = vi.fn();

    const { rerender } = render(
      <StudyDeckLoader isVisible isComplete={false} isHandoff minCycleMs={CYCLE} onCelebrated={onCelebrated} onFinished={onFinished} />,
    );
    rerender(<StudyDeckLoader isVisible isComplete isHandoff minCycleMs={CYCLE} onCelebrated={onCelebrated} onFinished={onFinished} />);

    expect(onCelebrated).not.toHaveBeenCalled();
    await waitFor(() => expect(onCelebrated).toHaveBeenCalledTimes(1), { timeout: 1000 });

    // Well past the deck's cycle: still up, because the destination hasn't
    // said it's ready.
    await new Promise((r) => setTimeout(r, CYCLE + 1500));
    expect(onFinished).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/^Loading$/);
  });

  it("finishes once the destination is ready and the deck has played through", async () => {
    const onFinished = vi.fn();
    const { rerender } = render(
      <StudyDeckLoader isVisible isComplete isHandoff minCycleMs={CYCLE} onCelebrated={() => {}} onFinished={onFinished} />,
    );

    // finishLoading(): complete, hand-off closed.
    rerender(<StudyDeckLoader isVisible isComplete minCycleMs={CYCLE} onFinished={onFinished} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Loading complete"), { timeout: 3000 });
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it("plays the full deck even when the destination is ready at once", async () => {
    const onFinished = vi.fn();
    render(<StudyDeckLoader isVisible isComplete minCycleMs={1500} onFinished={onFinished} />);

    await new Promise((r) => setTimeout(r, 1000));
    expect(screen.getByRole("status")).toHaveTextContent(/^Loading$/);
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1), { timeout: 5000 });
  });
});

describe("StudyDeckLoader display", () => {
  it("shows a study object while loading, then the graduation cap and its word", async () => {
    const { container, rerender } = render(
      <StudyDeckLoader isVisible isComplete={false} minCycleMs={CYCLE} completionWord="see you soon!" onFinished={() => {}} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    const stage = container.querySelector(".sd-stage img") as HTMLImageElement;
    expect(STUDY_OBJECTS.map((o) => o.src)).toContain(stage.getAttribute("src"));

    rerender(<StudyDeckLoader isVisible isComplete minCycleMs={CYCLE} completionWord="see you soon!" onFinished={() => {}} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Loading complete"), { timeout: 3000 });
    await waitFor(() =>
      expect(container.querySelector(`.sd-stage img[src="${COMPLETION_OBJECT.src}"]`)).not.toBeNull(),
    );
    await waitFor(() => expect(container.querySelector(".sd-word")).toHaveTextContent("see you soon!"));
  });

  it("renders nothing when hidden", () => {
    render(<StudyDeckLoader isVisible={false} isComplete={false} onFinished={() => {}} />);
    expect(screen.queryByTestId("study-deck-loader")).toBeNull();
  });

  it("drops the bob and sparks under reduced motion", async () => {
    motionPref.reduce = true;
    const { container, rerender } = render(
      <StudyDeckLoader isVisible isComplete={false} minCycleMs={CYCLE} onFinished={() => {}} />,
    );
    expect(container.querySelector(".sd-bob")).toBeNull();

    rerender(<StudyDeckLoader isVisible isComplete minCycleMs={CYCLE} onFinished={() => {}} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Loading complete"), { timeout: 3000 });
    expect(container.querySelector(".sd-spark")).toBeNull();
  });
});
