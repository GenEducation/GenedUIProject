import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../adminService", () => ({
  createUser: vi.fn(),
  listPartners: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/subjects/subjectCatalog", () => ({
  useTaxonomySubjects: vi.fn(() => []),
}));

import { createUser } from "../../adminService";
import { CreateAccountModal } from "../CreateAccountModal";
import { chooseSelectOption } from "@/test/helpers/select";

const createUserMock = vi.mocked(createUser);

function fillPartnerCredentials() {
  fireEvent.click(screen.getByRole("button", { name: "PARTNER" }));
  fireEvent.change(screen.getByPlaceholderText("user@example.com"), {
    target: { value: "school@example.com" },
  });
  const password = document.querySelector<HTMLInputElement>('input[type="password"]');
  expect(password).not.toBeNull();
  fireEvent.change(password!, { target: { value: "StrongPassword1" } });
}

describe("CreateAccountModal partner contract", () => {
  beforeEach(() => {
    createUserMock.mockReset().mockResolvedValue({});
  });

  it("blocks partner creation until a board is selected", () => {
    render(<CreateAccountModal onClose={vi.fn()} onCreated={vi.fn()} />);
    fillPartnerCredentials();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("An education board is required for a partner.")).toBeInTheDocument();
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("includes the selected board in the partner creation payload", async () => {
    render(<CreateAccountModal onClose={vi.fn()} onCreated={vi.fn()} />);
    fillPartnerCredentials();
    chooseSelectOption(screen.getByRole("combobox"), "ICSE");

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(createUserMock).toHaveBeenCalledWith({
      role: "PARTNER",
      email: "school@example.com",
      password: "StrongPassword1",
      board: "ICSE",
    });
  });
});
