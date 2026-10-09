import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ChatInput } from "../ChatInput";

/** A stand-in for the browser's speech recogniser: the test plays what it hears. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = 0;
  aborted = false;
  constructor() { FakeRecognition.last = this; }
  start() { this.started += 1; }
  stop() {}
  abort() { this.aborted = true; }
  /** Results since the last final, as the browser reports them. */
  hear(...parts: Array<[string, boolean]>) {
    const results = parts.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } }));
    act(() => this.onresult?.({ resultIndex: 0, results }));
  }
}

const box = () => screen.getByRole("textbox", { name: "Message your tutor" }) as HTMLTextAreaElement;

function renderInput(onSend = vi.fn()) {
  render(<ChatInput replying={false} disabled={false} onSend={onSend} onStop={vi.fn()} />);
  return onSend;
}

beforeEach(() => {
  FakeRecognition.last = null;
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;
});
afterEach(() => {
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

describe("dictation", () => {
  it("shows the mic only where the browser can recognise speech", () => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    renderInput();
    expect(screen.queryByRole("button", { name: "Dictate" })).toBeNull();
  });

  it("words appear in the box as they're heard; Done keeps them to edit and send", () => {
    const onSend = renderInput();
    fireEvent.change(box(), { target: { value: "SYNTHETIC so" } });
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));

    const rec = FakeRecognition.last!;
    expect(rec).toMatchObject({ continuous: true, interimResults: true, started: 1 });
    expect(screen.getByRole("group", { name: "Dictation" })).toBeInTheDocument();
    expect(box()).toHaveAttribute("readonly");

    rec.hear(["what is", false]);
    expect(box()).toHaveValue("SYNTHETIC so what is");
    rec.hear(["what is perimeter", true]);
    rec.hear(["of a square", false]);
    expect(box()).toHaveValue("SYNTHETIC so what is perimeter of a square");

    fireEvent.click(screen.getByRole("button", { name: "Done dictating" }));
    expect(rec.aborted).toBe(true);
    expect(box()).toHaveValue("SYNTHETIC so what is perimeter of a square");
    expect(box()).not.toHaveAttribute("readonly");

    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("SYNTHETIC so what is perimeter of a square");
  });

  it("Cancel throws the dictated words away and restores the box", () => {
    renderInput();
    fireEvent.change(box(), { target: { value: "SYNTHETIC kept" } });
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));
    FakeRecognition.last!.hear(["dropped words", true]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel dictation" }));
    expect(box()).toHaveValue("SYNTHETIC kept");
    expect(screen.getByRole("button", { name: "Dictate" })).toBeInTheDocument();
  });

  it("keeps listening when the browser ends a session on silence", () => {
    renderInput();
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));
    const rec = FakeRecognition.last!;
    rec.hear(["first part", false]);
    act(() => rec.onend?.());
    expect(rec.started).toBe(2);
    rec.hear(["second part", false]);
    expect(box()).toHaveValue("first part second part");
  });

  it("a blocked microphone stops dictation and says why", () => {
    renderInput();
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));
    act(() => FakeRecognition.last!.onerror?.({ error: "not-allowed" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Microphone access is blocked.");
    expect(screen.queryByRole("group", { name: "Dictation" })).toBeNull();
  });
});
