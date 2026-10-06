import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ChatMessageBubble } from "../ChatMessageBubble";
import type { ChatMessage } from "../../store/useStudentStore";

function message(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    text: "Hello there",
    sender: "ai",
    timestamp: "10:00 AM",
    ...over,
  };
}

describe("ChatMessageBubble", () => {
  it("renders assistant text via markdown, left-aligned", () => {
    const { container } = render(<ChatMessageBubble message={message({ text: "**Hi**" })} />);
    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(container.querySelector(".justify-start")).toBeInTheDocument();
  });

  it("right-aligns user messages", () => {
    const { container } = render(
      <ChatMessageBubble message={message({ sender: "user", text: "my question" })} />,
    );
    expect(screen.getByText("my question")).toBeInTheDocument();
    expect(container.querySelector(".justify-end")).toBeInTheDocument();
  });

  it("shows a processing indicator for an empty streaming placeholder", () => {
    render(<ChatMessageBubble message={message({ text: "" })} isStreaming />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("shows the status text while streaming with no content yet", () => {
    render(<ChatMessageBubble message={message({ text: "", statusText: "Drawing a diagram..." })} isStreaming />);
    expect(screen.getByText("Drawing a diagram...")).toBeInTheDocument();
  });

  it("delegates to MessageElements when the message carries structured elements", () => {
    render(
      <ChatMessageBubble
        message={message({
          text: "",
          elements: [{ id: "e1", type: "text", content: "Structured content" }],
        })}
      />,
    );
    expect(screen.getByText("Structured content")).toBeInTheDocument();
  });

  it("renders option chips for a finished assistant message", () => {
    const onOptionSelect = vi.fn();
    render(
      <ChatMessageBubble
        message={message({ options: ["Tell me more", "Next topic"] })}
        onOptionSelect={onOptionSelect}
      />,
    );
    expect(screen.getByText("Tell me more")).toBeInTheDocument();
    expect(screen.getByText("Next topic")).toBeInTheDocument();
  });

  it("renders a safety redirect visibly differently from an ordinary reply", () => {
    // A withheld turn and an answered one must not look the same. If they do, the child
    // reads the redirect as the answer to what they asked, which is the opposite of
    // what the gate is for.
    const { container: redirect } = render(
      <ChatMessageBubble message={message({ text: "Let's get back to the lesson!", isSafetyRedirect: true })} />,
    );
    const { container: ordinary } = render(
      <ChatMessageBubble message={message({ text: "Let's get back to the lesson!" })} />,
    );

    // Asserted positively on each side rather than by comparing two lookups:
    // ordinary replies are unboxed now, so a loose comparison would pass
    // vacuously if the redirect styling were ever dropped.
    const redirectCard = redirect.querySelector<HTMLElement>("[data-testid='message-surface']")!;
    expect(redirectCard.dataset.boxed).toBe("true");
    expect(redirectCard.style.background).toBe("rgb(255, 248, 236)");
    expect(redirectCard.style.border).toContain("1px solid");

    const ordinaryCard = ordinary.querySelector<HTMLElement>("[data-testid='message-surface']")!;
    expect(ordinaryCard.dataset.boxed).toBe("false");
    expect(ordinaryCard.style.background).toBe("");
  });

  it("renders an ordinary tutor reply with no card around it", () => {
    // The tutor's turn is long-form content — prose, sketches, widgets — and
    // reads as part of the page. Only the student's turn and a redirect sit on
    // a surface.
    render(<ChatMessageBubble message={message({ text: "Two times three is six." })} />);

    expect(screen.getByText("Two times three is six.")).toBeInTheDocument();

    const surface = screen.getByTestId("message-surface");
    expect(surface.style.background).toBe("");
    expect(surface.style.borderRadius).toBe("");
    // jsdom reads the `border: none` shorthand back as its width ("medium"),
    // so assert on the style longhand.
    expect(surface.style.borderStyle).toBe("none");
    expect(surface.style.boxShadow).toBe("none");
  });

  it("never styles a user message as a redirect", () => {
    // `isSafetyRedirect` describes what the tutor did, so it can only apply to the
    // tutor's side. A user bubble keeps its own treatment regardless.
    const { container: flagged } = render(
      <ChatMessageBubble message={message({ sender: "user", text: "hi", isSafetyRedirect: true })} />,
    );
    const { container: plain } = render(
      <ChatMessageBubble message={message({ sender: "user", text: "hi" })} />,
    );

    const flaggedBubble = flagged.querySelector<HTMLElement>("[data-testid='message-surface']")!;
    const plainBubble = plain.querySelector<HTMLElement>("[data-testid='message-surface']")!;

    // A user bubble always keeps its surface, so this compares two real values.
    expect(plainBubble.style.background).toBeTruthy();
    expect(flaggedBubble.style.background).toBe(plainBubble.style.background);
  });
});
