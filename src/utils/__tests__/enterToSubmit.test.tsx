import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { enterToSubmit } from "../enterToSubmit";

function Note({ onSubmit }: { onSubmit?: () => void }) {
  const [value, setValue] = useState("");
  return <textarea aria-label="Note" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={enterToSubmit(onSubmit)} />;
}

const note = () => screen.getByLabelText("Note") as HTMLTextAreaElement;

describe("enterToSubmit", () => {
  it("submits on Enter and adds a line on Ctrl/Cmd+Enter", () => {
    const onSubmit = vi.fn();
    render(<Note onSubmit={onSubmit} />);
    fireEvent.change(note(), { target: { value: "ab" } });
    note().setSelectionRange(1, 1);

    fireEvent.keyDown(note(), { key: "Enter", ctrlKey: true });
    expect(note().value).toBe("a\nb");
    fireEvent.keyDown(note(), { key: "Enter", metaKey: true });
    expect(note().value).toBe("a\n\nb");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(note(), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("leaves Shift+Enter and an IME's Enter to the browser", () => {
    const onSubmit = vi.fn();
    render(<Note onSubmit={onSubmit} />);
    fireEvent.keyDown(note(), { key: "Enter", shiftKey: true });
    fireEvent.keyDown(note(), { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the textarea's form when given no handler", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Note />
      </form>,
    );
    fireEvent.keyDown(note(), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
