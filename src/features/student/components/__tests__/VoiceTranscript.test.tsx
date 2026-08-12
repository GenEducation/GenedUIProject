import { describe, it, expect, beforeAll, vi } from "vitest";
import { render } from "@testing-library/react";

import { VoiceTranscript } from "../VoiceTranscript";
import type { ChatMessage } from "../../store/useStudentStore";

function msg(overrides: Partial<ChatMessage> & Pick<ChatMessage, "id" | "text" | "sender">): ChatMessage {
  return { timestamp: "10:00", ...overrides } as ChatMessage;
}

describe("VoiceTranscript", () => {
  // jsdom does not implement Element.scrollTo, which the auto-follow effect calls.
  beforeAll(() => {
    Element.prototype.scrollTo = vi.fn();
  });

  it("renders block math in a spoken turn as KaTeX, not raw LaTeX", () => {
    const { container } = render(
      <VoiceTranscript
        messages={[
          msg({
            id: "1",
            sender: "ai",
            text: "The formula is $$SI = \\frac{P \\times R \\times T}{100}$$ where **P** is the principal.",
          }),
        ]}
        agentName="Howie"
      />,
    );

    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.querySelector("strong")?.textContent).toBe("P");
    // KaTeX keeps the TeX source in a hidden MathML <annotation>; the only place
    // "\frac" may survive is there — never in the visible layout.
    container.querySelectorAll("annotation").forEach((a) => a.remove());
    expect(container.textContent).not.toContain("\\frac");
    expect(container.textContent).not.toContain("**P**");
  });

  it("renders the transcript text only once when the turn also carries a visual element", () => {
    const { container } = render(
      <VoiceTranscript
        messages={[
          msg({
            id: "1",
            sender: "ai",
            text: "Here is the graph.",
            elements: [{ id: "e1", type: "visual", content: "error", meta: { label: "Graph" } }],
          }),
        ]}
        agentName="Howie"
      />,
    );

    const occurrences = (container.textContent?.match(/Here is the graph\./g) || []).length;
    expect(occurrences).toBe(1);
  });

  it("defers to the element renderer when the turn carries its own text element", () => {
    const { container } = render(
      <VoiceTranscript
        messages={[
          msg({
            id: "1",
            sender: "ai",
            text: "Restored turn.",
            elements: [{ id: "e1", type: "text", content: "Restored turn." }],
          }),
        ]}
        agentName="Howie"
      />,
    );

    const occurrences = (container.textContent?.match(/Restored turn\./g) || []).length;
    expect(occurrences).toBe(1);
  });
});
