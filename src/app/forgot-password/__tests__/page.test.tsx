import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/features/auth/authService", () => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

import { requestPasswordReset, resetPassword } from "@/features/auth/authService";
import ForgotPasswordPage from "../page";

const requestPasswordResetMock = vi.mocked(requestPasswordReset);
const resetPasswordMock = vi.mocked(resetPassword);

beforeEach(() => {
  requestPasswordResetMock.mockReset().mockResolvedValue({ success: true, message: "sent" });
  resetPasswordMock.mockReset().mockResolvedValue({ success: true, message: "ok" });
});

function requestOtp(email = "kid@example.com") {
  fireEvent.change(screen.getByPlaceholderText("e.g. scholar@geneducation.ai"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: /send otp code/i }));
}

describe("forgot-password page", () => {
  it("requests an OTP and advances to the reset step", async () => {
    render(<ForgotPasswordPage />);
    requestOtp("kid@example.com");

    await waitFor(() => expect(requestPasswordResetMock).toHaveBeenCalledWith("kid@example.com"));
    await waitFor(() => expect(screen.getByText(/code sent to kid@example.com/i)).toBeInTheDocument());
  });

  it("shows the request error and stays on step 1", async () => {
    requestPasswordResetMock.mockRejectedValue(new Error("No account with that email"));
    render(<ForgotPasswordPage />);
    requestOtp();

    await waitFor(() => expect(screen.getByText("No account with that email")).toBeInTheDocument());
    expect(screen.queryByPlaceholderText("6-digit code")).not.toBeInTheDocument();
  });

  it("blocks submission when the new passwords don't match", async () => {
    render(<ForgotPasswordPage />);
    requestOtp();
    await waitFor(() => screen.getByPlaceholderText("6-digit code"));

    fireEvent.change(screen.getByPlaceholderText("6-digit code"), { target: { value: "123456" } });
    const [password, confirm] = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(password, { target: { value: "abcdefgh" } });
    fireEvent.change(confirm, { target: { value: "mismatch1" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("resets the password and shows the success state", async () => {
    render(<ForgotPasswordPage />);
    requestOtp("kid@example.com");
    await waitFor(() => screen.getByPlaceholderText("6-digit code"));

    fireEvent.change(screen.getByPlaceholderText("6-digit code"), { target: { value: "654321" } });
    const [password, confirm] = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(password, { target: { value: "abcdefgh" } });
    fireEvent.change(confirm, { target: { value: "abcdefgh" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() =>
      expect(resetPasswordMock).toHaveBeenCalledWith({
        email: "kid@example.com",
        otp_code: "654321",
        new_password: "abcdefgh",
      }),
    );
    await waitFor(() => expect(screen.getByText(/successfully reset/i)).toBeInTheDocument());
  });
});
