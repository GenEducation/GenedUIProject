import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { UnlinkConfirmationModal } from "../UnlinkConfirmationModal";

beforeEach(() => vi.clearAllMocks());

describe("UnlinkConfirmationModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <UnlinkConfirmationModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} studentName="Alice" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the student name in the confirmation copy", () => {
    render(<UnlinkConfirmationModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} studentName="Alice" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("Unlink fires onConfirm then onClose", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<UnlinkConfirmationModal isOpen onClose={onClose} onConfirm={onConfirm} studentName="Alice" />);

    fireEvent.click(screen.getByRole("button", { name: /^unlink$/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Keep closes without confirming", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<UnlinkConfirmationModal isOpen onClose={onClose} onConfirm={onConfirm} studentName="Alice" />);

    fireEvent.click(screen.getByRole("button", { name: /keep/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
