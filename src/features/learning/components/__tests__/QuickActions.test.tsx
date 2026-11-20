import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { makeLessonInstance } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import type { TeacherPayload } from "../../types";
import { QuickActions } from "../QuickActions";

const PAYLOAD: TeacherPayload = {
  schema_version: "teacher_node_v13",
  node: {
    id: "n1", title: "SYNTHETIC step", type: "teach", teach_only: false, figure_groups: [], check_items: [], est_minutes: 5,
    sections: [{ id: "s1", title: "S", path: [], chunks: [{ id: "g", element_type: "note", text: "crumbs: small pieces of food", page: 1 }] }],
    components: [{ id: "c1", title: "SYNTHETIC poles", definition: "SYNTHETIC a magnet has two poles." }],
    parent_los: [{ id: "lo1", code: "LO1", title: "SYNTHETIC explains magnets" }],
    discussion_prompts: [{ id: "d1", prompt: "SYNTHETIC why do the screws fall?" }],
  },
  student_context: { next_nodes: [] },
};

let send: ReturnType<typeof vi.fn>;

function setup(state: { canTalk?: boolean; payload?: TeacherPayload } = {}) {
  const instance = makeLessonInstance();
  send = vi.fn().mockResolvedValue(undefined);
  useLessonStore.setState({
    payload: state.payload ?? PAYLOAD,
    instance: state.canTalk === false ? { ...instance, state: "completed" } : instance,
    status: "ready",
    send,
  } as never);
  return render(<QuickActions />);
}

beforeEach(() => useLessonStore.getState().reset());

describe("QuickActions", () => {
  it("opens the step's key ideas and learning outcome from the payload", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Concepts/ }));
    const dialog = screen.getByRole("dialog", { name: "Key ideas of this step" });
    expect(dialog).toHaveTextContent("SYNTHETIC poles");
    expect(dialog).toHaveTextContent("SYNTHETIC a magnet has two poles.");
    expect(dialog).toHaveTextContent("SYNTHETIC explains magnets");
    expect(screen.getByRole("button", { name: /Concepts/ })).toHaveAttribute("aria-expanded", "true");
    expect(send).not.toHaveBeenCalled();
  });

  it("closes on Escape and gives focus back to its chip", async () => {
    setup();
    const chip = screen.getByRole("button", { name: /Notes/ });
    fireEvent.click(chip);
    expect(screen.getByRole("dialog", { name: "Notes from your book" })).toHaveTextContent("crumbs");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(chip).toHaveFocus();
  });

  it("a printed question is talked over with the tutor, and the pop-up closes", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Practice/ }));
    fireEvent.click(screen.getByRole("button", { name: /SYNTHETIC why do the screws fall\?/ }));
    expect(send).toHaveBeenCalledWith(expect.stringContaining("SYNTHETIC why do the screws fall?"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("a step whose book has no examples offers the tutor's example instead", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Examples/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("no worked example");
    fireEvent.click(screen.getByRole("button", { name: /Show me an example/ }));
    expect(send).toHaveBeenCalledWith("Can you show me an example?");
  });

  it("still shows the book's content when the tutor can't be asked, with its tutor buttons off", () => {
    setup({ canTalk: false });
    fireEvent.click(screen.getByRole("button", { name: /Practice/ }));
    expect(screen.getByRole("button", { name: /SYNTHETIC why do the screws fall\?/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Give me a practice question/ })).toBeDisabled();
  });
});
