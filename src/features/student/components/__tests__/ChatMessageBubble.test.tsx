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
});
