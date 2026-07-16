import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../authService", () => ({ resetPassword: vi.fn() }));

import { resetPassword } from "../../authService";
import { ResetPassword } from "../ResetPassword";

const resetPasswordMock = vi.mocked(resetPassword);

function fillForm(overrides: Partial<Record<"email" | "otp" | "password" | "confirm", string>> = {}) {
  fireEvent.change(screen.getByPlaceholderText("e.g. socrates@example.com"), {
    target: { value: overrides.email ?? "kid@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter 6-digit code"), {
    target: { value: overrides.otp ?? "123456" },
  });
  const [password, confirm] = screen.getAllByPlaceholderText("••••••••");
  fireEvent.change(password, { target: { value: overrides.password ?? "newpassword1" } });
  fireEvent.change(confirm, { target: { value: overrides.confirm ?? "newpassword1" } });
}

beforeEach(() => {
  resetPasswordMock.mockReset().mockResolvedValue({ success: true, message: "ok" });
});

describe("ResetPassword", () => {
  it("prefills the email from props and submits the reset payload", async () => {
    render(<ResetPassword token="tok" initialEmail="prefilled@example.com" />);
    expect(screen.getByDisplayValue("prefilled@example.com")).toBeInTheDocument();

    fillForm({ email: "prefilled@example.com" });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() =>
      expect(resetPasswordMock).toHaveBeenCalledWith({
        email: "prefilled@example.com",
        otp_code: "123456",
        new_password: "newpassword1",
      }),
    );
    await waitFor(() => expect(screen.getByText(/reset successfully/i)).toBeInTheDocument());
  });

  it("shows a mismatch error and does not call the service when passwords differ", () => {
    render(<ResetPassword token="tok" />);
    fillForm({ password: "abcdefgh", confirm: "different1" });

    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters", () => {
    render(<ResetPassword token="tok" />);
    fillForm({ password: "short1", confirm: "short1" });

    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("surfaces the server error message on failure", async () => {
    resetPasswordMock.mockRejectedValue(new Error("OTP expired"));
    render(<ResetPassword token="tok" />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(screen.getByText("OTP expired")).toBeInTheDocument());
  });
});
