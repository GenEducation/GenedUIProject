import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// MessageElements dispatches to several heavy widgets (canvas sketches, GeoGebra
// iframes, authenticated image fetches) that are out of scope for jsdom per the
// testing roadmap. Stub them so this suite verifies ONLY the dispatch/props wiring.
vi.mock("../VisualBlock", () => ({
  VisualBlock: (props: { svg?: string; image?: string }) => (
    <div data-testid="visual-block">{props.svg ? "svg" : "image"}</div>
  ),
}));
vi.mock("../MathWidget", () => ({
  MathWidget: (props: { expression: string }) => <div data-testid="math-widget">{props.expression}</div>,
}));
vi.mock("../FigureView", () => ({ FigureView: (props: { uuid: string }) => <div data-testid="figure-view">{props.uuid}</div> }));
vi.mock("../P5Visual", () => ({ P5Visual: () => <div data-testid="p5-visual" /> }));
vi.mock("../GeoGebraVisual", () => ({ GeoGebraVisual: () => <div data-testid="geogebra-visual" /> }));
vi.mock("../ComprehensionWidget", () => ({
  ComprehensionWidget: (props: { question?: string }) => <div data-testid="comprehension-widget">{props.question}</div>,
}));
vi.mock("../KaraokeRenderer", () => ({
  KaraokeRenderer: (props: { text: string }) => <div data-testid="karaoke-renderer">{props.text}</div>,
}));
vi.mock("../interactive/InteractiveBlock", () => ({
  InteractiveBlock: (props: { directiveId: string }) => <div data-testid="interactive-block">{props.directiveId}</div>,
}));

import { MessageElements } from "../MessageElements";
import type { ChatElement } from "../../store/useStudentStore";

describe("MessageElements — dispatch by element type", () => {
  it("renders text elements through the markdown pipeline", () => {
    const els: ChatElement[] = [{ id: "1", type: "text", content: "Hello world" }];
    render(<MessageElements elements={els} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("routes p5sketch visuals straight to P5Visual, with no card chrome", () => {
    const els: ChatElement[] = [
      { id: "1", type: "visual", content: "p5sketch", meta: { engine: "p5sketch", label: "Graph", code: "draw()" } },
    ];
    render(<MessageElements elements={els} />);
    expect(screen.getByTestId("p5-visual")).toBeInTheDocument();
    // Visuals are frameless — the label is not painted as a caption.
    expect(screen.queryByText("Graph")).not.toBeInTheDocument();
  });

  it("routes geogebra visuals to GeoGebraVisual", () => {
    const els: ChatElement[] = [
      { id: "1", type: "visual", content: "geogebra", meta: { engine: "geogebra", commands: ["A=(1,1)"] } },
    ];
    render(<MessageElements elements={els} />);
    expect(screen.getByTestId("geogebra-visual")).toBeInTheDocument();
  });

  it("shows a friendly fallback for a visual-error element", () => {
    const els: ChatElement[] = [{ id: "1", type: "visual", content: "error", meta: { label: "Bad sketch" } }];
    render(<MessageElements elements={els} />);
    expect(screen.getByText(/Visual unavailable — Bad sketch/)).toBeInTheDocument();
  });

  it("routes svg elements to VisualBlock", () => {
    const els: ChatElement[] = [{ id: "1", type: "svg", content: "<svg></svg>" }];
    render(<MessageElements elements={els} />);
    expect(screen.getByTestId("visual-block")).toHaveTextContent("svg");
  });

  it("routes widget elements to MathWidget with the expression", () => {
    const els: ChatElement[] = [{ id: "1", type: "widget", content: "x^2 + 1" }];
    render(<MessageElements elements={els} />);
    expect(screen.getByTestId("math-widget")).toHaveTextContent("x^2 + 1");
  });

  it("routes comprehension_widget elements with the question text", () => {
    const els: ChatElement[] = [
      { id: "1", type: "comprehension_widget", content: "q", meta: { question: "What color is the sky?" } },
    ];
    render(<MessageElements elements={els} />);
    expect(screen.getByTestId("comprehension-widget")).toHaveTextContent("What color is the sky?");
  });

  it("routes english_skill_view elements to KaraokeRenderer", () => {
    const els: ChatElement[] = [{ id: "1", type: "english_skill_view", content: "Read this aloud" }];
    render(<MessageElements elements={els} />);
    expect(screen.getByTestId("karaoke-renderer")).toHaveTextContent("Read this aloud");
  });

  it("routes interactive elements to InteractiveBlock with the directive id", () => {
    const els: ChatElement[] = [
      { id: "el-1", type: "interactive", content: "grid", meta: { directive_id: "dir-9" } },
    ];
    render(<MessageElements elements={els} />);
    expect(screen.getByTestId("interactive-block")).toHaveTextContent("dir-9");
  });

  it("shows the tool status pill only while streaming", () => {
    const { rerender } = render(<MessageElements elements={[]} toolStatus="Thinking..." isStreaming />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();

    rerender(<MessageElements elements={[]} toolStatus="Thinking..." isStreaming={false} />);
    expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
  });
});
