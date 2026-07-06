import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GoogleOAuthProvider } from "@react-oauth/google";

// SignUp lazily does `await import("../authService")` for sendOtp; intercept that
// resolved module so no real network/env-dependent code runs.
vi.mock("../../authService", () => ({ sendOtp: vi.fn() }));

import { sendOtp } from "../../authService";
import { SignUp } from "../SignUp";
import type { SignUpFields } from "../../authService";

const sendOtpMock = vi.mocked(sendOtp);

const initial: SignUpFields = {
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
  grade: "",
  phone: "",
  otp_code: "",
  parent_email: "",
  username: "",
};

// A thin stateful harness mirroring how register/page.tsx wires SignUp: the component
// itself is presentational, so realistic interaction needs a real controlled parent.
function Harness(props: {
  errors?: Record<string, string>;
  isSubmitting?: boolean;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
} = {}) {
  const [signupData, setSignupData] = useState<SignUpFields>(initial);
  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setSignupData((s) => ({ ...s, [name]: value }));
  };
  return (
    <GoogleOAuthProvider clientId="test-client-id">
      <SignUp
        signupData={signupData}
        onChange={onChange}
        onSubmit={props.onSubmit ?? vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault())}
        onSwitchToSignin={vi.fn()}
        isSubmitting={props.isSubmitting ?? false}
        errors={props.errors ?? {}}
        onGoogleSuccess={vi.fn()}
      />
    </GoogleOAuthProvider>
  );
}

beforeEach(() => {
  sendOtpMock.mockReset().mockResolvedValue({ success: true, message: "sent" });
});

// Step transitions are gated behind framer-motion's <AnimatePresence mode="wait">,
// which mounts the next step only after the previous one's exit animation resolves —
// asynchronous even in jsdom. Every assertion that depends on the new step must wait.

describe("SignUp — role selection", () => {
  it("starts on the role-select step and advances to student details on click", async () => {
    render(<Harness />);
    expect(screen.getByText(/select your role to get started/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /\bstudent\b/i }));

    await waitFor(() => expect(screen.getByText("Student Details")).toBeInTheDocument());
    expect(screen.getByText("What grade are you in?")).toBeInTheDocument();
  });

  it("advances to the parent credentials step on Parent click", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /\bparent\b/i }));
    await waitFor(() => expect(screen.getByText("Account Credentials")).toBeInTheDocument());
  });
});

describe("SignUp — student flow", () => {
  async function goToStudentStep2() {
    fireEvent.click(screen.getByRole("button", { name: /\bstudent\b/i }));
    await waitFor(() => expect(screen.getByText("Student Details")).toBeInTheDocument());
  }

  it("disables submit until a grade is picked, then enables it", async () => {
    render(<Harness />);
    await goToStudentStep2();

    const submit = screen.getByRole("button", { name: /create account/i });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "6" }));
    expect(submit).not.toBeDisabled();
  });

  it("calls onSubmit when the student form is submitted with a grade selected", async () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    render(<Harness onSubmit={onSubmit} />);
    await goToStudentStep2();
    fireEvent.click(screen.getByRole("button", { name: "6" }));

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("sends an OTP and reveals the OTP field when signing up with a personal email", async () => {
    render(<Harness />);
    await goToStudentStep2();
    fireEvent.click(screen.getByLabelText(/sign up with my personal email/i));

    fireEvent.change(screen.getByPlaceholderText("scholar@example.com"), {
      target: { value: "kid@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(screen.getByText("OTP sent to your email!")).toBeInTheDocument());
    expect(sendOtpMock).toHaveBeenCalledWith("kid@example.com");
    expect(screen.getByText("OTP Code")).toBeInTheDocument();
  });

  it("renders server-provided field errors", async () => {
    render(<Harness errors={{ username: "Username is compulsory", grade: "Please select your grade" }} />);
    await goToStudentStep2();

    expect(screen.getByText("Username is compulsory")).toBeInTheDocument();
    expect(screen.getByText("Please select your grade")).toBeInTheDocument();
  });
});

describe("SignUp — parent flow", () => {
  async function goToParentCredentials() {
    fireEvent.click(screen.getByRole("button", { name: /\bparent\b/i }));
    await waitFor(() => expect(screen.getByText("Account Credentials")).toBeInTheDocument());
  }

  async function fillParentCredentialsAndContinue() {
    fireEvent.change(screen.getByPlaceholderText("scholar@gened.edu"), {
      target: { value: "parent@example.com" },
    });
    const [password, confirm] = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(password, { target: { value: "secret1" } });
    fireEvent.change(confirm, { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(screen.getByText("Complete Profile")).toBeInTheDocument());
  }

  it("moves from credentials to the profile step once local validation passes", async () => {
    render(<Harness />);
    await goToParentCredentials();
    await fillParentCredentialsAndContinue();

    expect(screen.getByText("Phone Number")).toBeInTheDocument();
  });

  it("calls onSubmit from the final profile step", async () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    render(<Harness onSubmit={onSubmit} />);
    await goToParentCredentials();
    await fillParentCredentialsAndContinue();

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
