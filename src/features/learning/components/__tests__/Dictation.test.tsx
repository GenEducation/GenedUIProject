import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ChatInput } from "../ChatInput";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { resetSpeechLanguage } from "../../dictation/useSpeechLanguage";

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
  localStorage.clear();
  resetSpeechLanguage();
  FakeRecognition.last = null;
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;
});
afterEach(() => {
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

describe("dictation", () => {
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

  it("a blocked microphone stops dictation and says why", () => {
    renderInput();
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));
    act(() => FakeRecognition.last!.onerror?.({ error: "not-allowed" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Microphone access is blocked.");
    expect(screen.queryByRole("group", { name: "Dictation" })).toBeNull();
  });
});

describe("dictation in other languages", () => {
  beforeEach(() => {
    useStudentStore.setState({ studentProfile: null });
  });

  const dictateIn = (subject?: string) => {
    render(<ChatInput replying={false} disabled={false} onSend={vi.fn()} onStop={vi.fn()} subject={subject} />);
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));
    return FakeRecognition.last!;
  };
  const pick = (english: string) => {
    fireEvent.click(screen.getByRole("button", { name: /^Dictation language:/ }));
    fireEvent.click(screen.getByRole("option", { name: new RegExp(english) }));
  };

  it("the learner can pick another language, and it's remembered next time", () => {
    const { unmount } = render(<ChatInput replying={false} disabled={false} onSend={vi.fn()} onStop={vi.fn()} />);
    pick("Marathi");
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));
    expect(FakeRecognition.last!.lang).toBe("mr-IN");
    unmount();

    // a new lesson, even a Hindi one, starts in the learner's own pick
    expect(dictateIn("Hindi").lang).toBe("mr-IN");
  });

  it("switching language mid-dictation keeps the words and carries on in the new one", () => {
    const first = dictateIn();
    first.hear(["SYNTHETIC hello", true]);

    pick("Hindi");
    const second = FakeRecognition.last!;
    expect(second).not.toBe(first);
    expect(first.aborted).toBe(true);
    expect(second).toMatchObject({ lang: "hi-IN", started: 1 });

    second.hear(["SYNTHETIC नमस्ते", true]);
    expect(box()).toHaveValue("SYNTHETIC hello SYNTHETIC नमस्ते");
  });
});
