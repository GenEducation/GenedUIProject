import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReadAloudDeps, SocketLike } from "../../reading/readAloud";
import { ReadingPractice } from "../ReadingPractice";

class FakeSocket implements SocketLike {
  readyState = 1;
  binaryType = "blob";
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send() {}
  close() {}
  say(frame: object) {
    act(() => this.onmessage?.({ data: JSON.stringify(frame) }));
  }
}

const EXCERPT = "SYNTHETIC Meera saw a kite.";

function setup() {
  const socket = new FakeSocket();
  const capture: ReadAloudDeps = { openSocket: () => socket, openMic: vi.fn(async () => ({ stop: () => {} })), finalWaitMs: 20 };
  const onClose = vi.fn();
  render(<ReadingPractice instanceId="inst-1" passageId="p-1" segment={1} excerpt={EXCERPT} capture={capture} onClose={onClose} />);
  return { socket, onClose };
}
const heardWords = () =>
  Array.from(screen.getByRole("region", { name: "Reading practice" }).querySelectorAll("[data-heard=true]")).map((w) => w.textContent);

describe("ReadingPractice", () => {
  it("shows the piece once, with the steps, and asks for nothing until started", () => {
    setup();
    const region = screen.getByRole("region", { name: "Reading practice" });
    expect(region).toHaveTextContent(EXCERPT);
    expect(within(region).getByText("Tap Start reading")).toBeInTheDocument();
    expect(heardWords()).toEqual([]);
  });

  it("lights words up as they are heard, marks the next one, then marks what was missed", async () => {
    const { socket } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Start reading" }));
    act(() => socket.onopen?.());
    socket.say({ type: "ready" });
    await screen.findByText("Listening…");

    socket.say({ type: "heard", text: "synthetic meera", final: false });
    expect(heardWords()).toEqual(["SYNTHETIC", "Meera"]);
    expect(screen.getByText("saw")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("2 of 5 words picked up")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "I'm done" }));
    socket.say({ type: "heard", text: "synthetic meera saw kite", final: true });
    await waitFor(() => expect(screen.getByRole("list", { name: "Words not picked up" })).toHaveTextContent("a"));
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("goes back to the book, closing the microphone", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Back to the book" }));
    expect(onClose).toHaveBeenCalled();
  });
});
