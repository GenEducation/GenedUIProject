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
  it("renders nothing when closed", () => {
    const { container } = render(
      <InviteStudentModal isOpen={false} onClose={vi.fn()} onInvite={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("blocks submit with a validation error when the identifier is empty", () => {
    const { onInvite } = setup();
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    expect(screen.getByText(/enter a student's email or username/i)).toBeInTheDocument();
    expect(onInvite).not.toHaveBeenCalled();
  });

  it("invites with the trimmed identifier and default subject, then closes", async () => {
    const { onInvite, onClose } = setup();
    fireEvent.change(screen.getByPlaceholderText(/student@school/i), {
      target: { value: "  kid@x.com  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() => expect(onInvite).toHaveBeenCalledWith("kid@x.com", "English"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("passes the chosen subject", async () => {
    const { onInvite } = setup();
    fireEvent.change(screen.getByPlaceholderText(/student@school/i), { target: { value: "kid" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Science" } });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() => expect(onInvite).toHaveBeenCalledWith("kid", "Science"));
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
