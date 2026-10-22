import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StatusActions, transitionsFrom } from "../ui/StatusActions";

describe("transitionsFrom", () => {
  it.each([
    ["PENDING", ["APPROVED", "REJECTED"]],
    ["APPROVED", ["REVOKED"]],
    ["REJECTED", ["APPROVED"]],
    ["REVOKED", ["APPROVED"]],
  ])("offers only the moves that make sense from %s", (from, expected) => {
    expect(transitionsFrom(from)).toEqual(expected);
  });

  it("falls back to every move for a status it does not know", () => {
    expect(transitionsFrom("SOMETHING_NEW")).toEqual(["APPROVED", "REJECTED", "REVOKED"]);
  });
});

describe("StatusActions", () => {
  it("approves a pending request", () => {
    const onSet = vi.fn();
    render(<StatusActions status="PENDING" onSet={onSet} />);
    expect(screen.queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(onSet).toHaveBeenCalledWith("APPROVED");
  });

  it("revokes a live link and offers nothing else", () => {
    const onSet = vi.fn();
    render(<StatusActions status="APPROVED" onSet={onSet} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));
    expect(onSet).toHaveBeenCalledWith("REVOKED");
  });
});
