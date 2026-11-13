import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonActivity } from "@/features/student/learner/types";
import { fetchActivityAudio } from "../../reading/passageAudio";
import { useLessonStore } from "../../useLessonStore";
import { ActivityCard, CompletedActivities } from "../ActivityCard";

vi.mock("../../reading/passageAudio", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../reading/passageAudio")>(),
  fetchActivityAudio: vi.fn(),
}));

const text = "SYNTHETIC learner response";
const activity: LessonActivity = { item_id: "activity-1", mode: "write", prompt: "SYNTHETIC approved prompt", passage: null, attempted: false };
const initial = useLessonStore.getInitialState();

describe("lesson activities", () => {
  beforeEach(() => {
    useLessonStore.setState({ ...initial, instanceId: "lesson-1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useLessonStore.setState(initial);
  });

  it("submits an open response and offers practice after the step is complete", async () => {
    const submit = vi.fn().mockResolvedValue({ id: "attempt-1", attempted: true, not_attempted_reason: null });
    useLessonStore.setState({ submitActivity: submit });
    const { rerender } = render(<ActivityCard nodeId="step-1" activity={activity} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    await screen.findByText("Answer saved.");
    expect(submit).toHaveBeenCalledWith("step-1", "activity-1", text, expect.any(String));

    const done = { ...activity, attempted: true };
    useLessonStore.setState({ instance: {
      id: "lesson-1", chapter_id: "chapter-1", state: "completed", next_action: "completed", nodes_done: 1, nodes_total: 1,
      completed_nodes: [{ instance_node_id: "step-1", title: "SYNTHETIC step", activities: [done] }],
    } });
    rerender(<CompletedActivities />);
    fireEvent.click(screen.getByText("Practise completed activities"));
    fireEvent.click(screen.getByRole("button", { name: "Practice again" }));
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("");
  });

  it("only plays a listening passage and enables answering after playback", async () => {
    const audio = { src: "", play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), onended: null as (() => void) | null };
    vi.stubGlobal("Audio", class { constructor() { return audio; } });
    vi.stubGlobal("URL", Object.assign(class extends URL {}, {
      createObjectURL: vi.fn().mockReturnValue("blob:synthetic-audio"), revokeObjectURL: vi.fn(),
    }));
    vi.mocked(fetchActivityAudio).mockResolvedValue(new Blob());
    render(<ActivityCard nodeId="step-1" activity={{ ...activity, mode: "listen", passage: "SYNTHETIC private script" }} />);
    expect(screen.queryByText("SYNTHETIC private script")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play passage" }));
    await waitFor(() => expect(audio.play).toHaveBeenCalledOnce());
    expect(fetchActivityAudio).toHaveBeenCalledWith("lesson-1", "step-1", "activity-1", "en");
    expect(screen.queryByRole("textbox")).toBeNull();
    act(() => audio.onended?.());
    expect(screen.getByRole("textbox", { name: "Your answer" })).toBeVisible();
  });

  it("shows the text to read aloud and uses the microphone entry for speaking", () => {
    const { rerender } = render(<ActivityCard nodeId="step-1" activity={{ ...activity, mode: "read_aloud", passage: "SYNTHETIC reading passage" }} />);
    expect(screen.getByText("SYNTHETIC reading passage")).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();
    rerender(<ActivityCard nodeId="step-1" activity={{ ...activity, mode: "speak" }} />);
    expect(screen.queryByText("SYNTHETIC reading passage")).toBeNull();
    expect(screen.getByRole("button", { name: "Start answering" })).toBeVisible();
  });
});
