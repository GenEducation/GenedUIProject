import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ReadingControls } from "../ReadingControls";
import { ListenError, LISTEN_MESSAGES, problemFor } from "../../reading/passageAudio";
import type { AudioDeps } from "../../reading/useSegmentAudio";
import type { ReadAloudDeps, SocketLike } from "../../reading/readAloud";

class FakeAudio {
  src = "";
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  static refuse = false;
  play = vi.fn(async () => {
    if (FakeAudio.refuse) throw new Error("NotAllowedError");
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
}

let audios: FakeAudio[];
let fetchAudio: ReturnType<typeof vi.fn>;
let revoked: string[];

function audioDeps(): AudioDeps {
  return {
    fetchAudio: fetchAudio as unknown as AudioDeps["fetchAudio"],
    createAudio: () => {
      const a = new FakeAudio();
      audios.push(a);
      return a as unknown as HTMLAudioElement;
    },
    objectUrl: () => "blob:synthetic",
    revokeUrl: (url) => revoked.push(url),
  };
}

const TEXT = "SYNTHETIC one. SYNTHETIC two. SYNTHETIC three. SYNTHETIC four.";
const captureOff = () => false;

function show(overrides: Partial<React.ComponentProps<typeof ReadingControls>> = {}) {
  return render(
    <ReadingControls instanceId="inst-1" passageId="p-1" segment={1} text={TEXT} audio={audioDeps()} canCapture={captureOff} {...overrides} />,
  );
}

beforeEach(() => {
  audios = [];
  revoked = [];
  FakeAudio.refuse = false;
  fetchAudio = vi.fn(async () => new Blob(["x"], { type: "audio/wav" }));
});

describe("listening", () => {
  it("plays the part, pauses it, stops it and plays it again, asking the server for the audio once", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Pause listening" })).toBeInTheDocument());
    expect(fetchAudio).toHaveBeenCalledWith("inst-1", "p-1", 1);
    expect(audios[0].src).toBe("blob:synthetic");

    fireEvent.click(screen.getByRole("button", { name: "Pause listening" }));
    expect(audios[0].pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Keep listening" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));
    expect(audios[0].currentTime).toBe(0);
    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Listen again from the start" }));
    await waitFor(() => expect(audios[0].play).toHaveBeenCalledTimes(2));
    expect(fetchAudio).toHaveBeenCalledTimes(1);
    expect(audios).toHaveLength(1);
  });

  it("returns to Listen when the audio ends", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Pause listening" })).toBeInTheDocument());

    act(() => audios[0].onended?.());

    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
  });

  it.each([
    [402, "trial"],
    [404, "not_in_lesson"],
    [409, "language"],
    [422, "language"],
    [503, "busy"],
    [502, "unavailable"],
  ] as const)("a %s from the server says why in plain words and leaves reading available", async (status, problem) => {
    expect(problemFor(status)).toBe(problem);
    fetchAudio = vi.fn(async () => {
      throw new ListenError(problem);
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));

    await waitFor(() => expect(document.body.textContent).toContain(LISTEN_MESSAGES[problem]));
    expect(screen.getByRole("button", { name: "Listen" })).toBeEnabled();
  });

  it("a browser that refuses to play says so instead of failing silently", async () => {
    FakeAudio.refuse = true;
    show();
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));

    await waitFor(() => expect(document.body.textContent).toContain(LISTEN_MESSAGES.unsupported));
    expect(screen.getByRole("button", { name: "Listen" })).toBeEnabled();
  });

  it("releases the audio when the learner leaves the part", async () => {
    const view = show();
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Pause listening" })).toBeInTheDocument());

    view.unmount();

    expect(revoked).toEqual(["blob:synthetic"]);
    expect(audios[0].pause).toHaveBeenCalled();
  });

  it("has labelled controls a keyboard and a screen reader can use", () => {
    show();
    expect(screen.getByRole("group", { name: "Listen to part 1" })).toBeInTheDocument();
    for (const name of ["Stop listening", "Listen again from the start"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.getAllByRole("status").every((s) => s.getAttribute("aria-live") === "polite")).toBe(true);
  });
});

describe("read-aloud practice", () => {
  it("is not offered where the browser cannot capture audio, and the rest of the controls still work", () => {
    show({ canCapture: () => false });
    expect(screen.queryByRole("button", { name: /Give reading a try/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
  });

  it("is offered, optional, and asks for nothing until the learner starts", () => {
    const socket = vi.fn();
    const capture: ReadAloudDeps = { openSocket: socket as unknown as () => SocketLike, openMic: vi.fn() };
    show({ canCapture: () => true, capture });

    fireEvent.click(screen.getByRole("button", { name: /Give reading a try/ }));

    expect(screen.getByRole("region", { name: "Reading practice" })).toBeInTheDocument();
    expect(screen.getByText("SYNTHETIC one. SYNTHETIC two. SYNTHETIC three.")).toBeInTheDocument();
    expect(socket).not.toHaveBeenCalled();
    expect(capture.openMic).not.toHaveBeenCalled();
  });
});
