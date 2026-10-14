import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { InviteStudentModal } from "../InviteStudentModal";

function setup(onInvite = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(<InviteStudentModal isOpen onClose={onClose} onInvite={onInvite} />);
  return { onInvite, onClose };
}

beforeEach(() => vi.clearAllMocks());

describe("InviteStudentModal", () => {
  it("invites with the trimmed identifier and default subject, then closes", async () => {
    const { onInvite, onClose } = setup();
    // The subject list loads from the catalog; wait for its default before submitting.
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("English"));
    fireEvent.change(screen.getByPlaceholderText(/student@school/i), {
      target: { value: "  kid@x.com  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() => expect(onInvite).toHaveBeenCalledWith("kid@x.com", "English"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("surfaces the invite error and does not close on failure", async () => {
    const onInvite = vi.fn().mockRejectedValue(new Error("Student already invited"));
    const { onClose } = setup(onInvite);
    fireEvent.change(screen.getByPlaceholderText(/student@school/i), { target: { value: "kid" } });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() => expect(screen.getByText(/student already invited/i)).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });
});
