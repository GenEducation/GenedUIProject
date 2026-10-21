import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GoogleOAuthProvider } from "@react-oauth/google";

// SignUp lazily does `await import("../authService")` for sendOtp; intercept that
// resolved module so no real network/env-dependent code runs.
vi.mock("../../authService", () => ({ sendOtp: vi.fn(), sendGuardianOtp: vi.fn() }));

import { sendOtp, sendGuardianOtp } from "../../authService";
import { SignUp } from "../SignUp";
import type { SignUpFields } from "../../authService";

const sendOtpMock = vi.mocked(sendOtp);
const sendGuardianOtpMock = vi.mocked(sendGuardianOtp);

const initial: SignUpFields = {
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
  grade: "",
  phone: "",
  otp_code: "",
  parent_email: "",
  parent_otp_code: "",
  username: "",
};

// A thin stateful harness mirroring how register/RegisterForm.tsx wires SignUp: the component
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
  sendGuardianOtpMock.mockReset().mockResolvedValue({ status: "success", message: "sent" });
});

// Step transitions are gated behind framer-motion's <AnimatePresence mode="wait">,
// which mounts the next step only after the previous one's exit animation resolves —
// asynchronous even in jsdom. Every assertion that depends on the new step must wait.
//
// The card no longer carries step headings or a "Step n of m" counter, so each
// step is identified by a field unique to it.

/** Pick a grade from the shared Select (replaced the old 1..12 button grid). */
async function selectGrade(label: string) {
  fireEvent.click(screen.getByRole("combobox", { name: /what grade are you in/i }));
  const option = await screen.findByRole("option", { name: label });
  fireEvent.click(option);
}

describe("SignUp — student flow", () => {
  async function goToStudentStep2() {
    fireEvent.click(screen.getByRole("button", { name: /\bstudent\b/i }));
    await waitFor(() => expect(screen.getByText("What grade are you in?")).toBeInTheDocument());
  }

  it("calls onSubmit once the student form is complete", async () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    render(<Harness onSubmit={onSubmit} />);
    await goToStudentStep2();

    fireEvent.change(screen.getByPlaceholderText("e.g. creative_coder"), {
      target: { value: "curious_kid" },
    });
    fireEvent.change(screen.getByPlaceholderText("parent@example.com"), {
      target: { value: "parent@example.com" },
    });
    // The parent's address is verified with the code we email them.
    fireEvent.click(screen.getByRole("button", { name: "Send code to parent" }));
    fireEvent.change(await screen.findByPlaceholderText("6-digit code"), { target: { value: "123456" } });
    fireEvent.change(screen.getByPlaceholderText("Create a password"), {
      target: { value: "Mangoes7" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "Mangoes7" },
    });
    await selectGrade("Grade 6");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sendGuardianOtpMock).toHaveBeenCalledWith("parent@example.com");
  });

  it("asks for the parent's code before the account is created", async () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    render(<Harness onSubmit={onSubmit} />);
    await goToStudentStep2();
    fireEvent.change(screen.getByPlaceholderText("e.g. creative_coder"), { target: { value: "curious_kid" } });
    fireEvent.change(screen.getByPlaceholderText("parent@example.com"), { target: { value: "parent@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Create a password"), { target: { value: "Mangoes7" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), { target: { value: "Mangoes7" } });
    await selectGrade("Grade 6");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Send a code to your parent and type it here")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a code sent to one address is cleared when the address changes", async () => {
    render(<Harness />);
    await goToStudentStep2();
    fireEvent.change(screen.getByPlaceholderText("parent@example.com"), { target: { value: "mum@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code to parent" }));
    const code = await screen.findByPlaceholderText("6-digit code");
    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.change(screen.getByPlaceholderText("parent@example.com"), { target: { value: "dad@example.com" } });
    await waitFor(() => expect(screen.queryByPlaceholderText("6-digit code")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Send code to parent" })).toBeInTheDocument();
  });

  it("blocks an incomplete student submission with inline errors", async () => {
    // Students used to fall straight through to the server; step 2 is now the
    // final step for them, so the same local gate as the parent flow applies.
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    render(<Harness onSubmit={onSubmit} />);
    await goToStudentStep2();
    await selectGrade("Grade 6");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText("Username is required")).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
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

  it("locks the send button for retry_after seconds when too many codes are pending (AUTH_1207)", async () => {
    sendOtpMock.mockRejectedValue(
      Object.assign(new Error("Too many OTP requests. Please wait."), { error_code: "AUTH_1207", retry_after: 120 }),
    );
    render(<Harness />);
    await goToStudentStep2();
    fireEvent.click(screen.getByLabelText(/sign up with my personal email/i));
    fireEvent.change(screen.getByPlaceholderText("scholar@example.com"), {
      target: { value: "kid@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(screen.getByText("Too many OTP requests. Please wait.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /resend in 1(20|19)s/i })).toBeDisabled();
  });
});

describe("SignUp — parent flow", () => {
  async function goToParentCredentials() {
    fireEvent.click(screen.getByRole("button", { name: /\bparent\b/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("scholar@gened.edu")).toBeInTheDocument(),
    );
  }

  function fillParentCredentials() {
    fireEvent.change(screen.getByPlaceholderText("scholar@gened.edu"), {
      target: { value: "parent@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a password"), {
      target: { value: "Mangoes7" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "Mangoes7" },
    });
  }

  it("a parent's invitation link (/register?role=parent) opens the parent form directly", async () => {
    window.history.pushState({}, "", "/register?role=parent&redirect=%2Fparent");
    try {
      render(<Harness onSubmit={vi.fn()} />);
      expect(await screen.findByPlaceholderText("scholar@gened.edu")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Back to role selection" })).toBeInTheDocument();
    } finally {
      window.history.pushState({}, "", "/");
    }
  });

  it("asks the parent for their name, saying who sees it", async () => {
    render(<Harness onSubmit={vi.fn()} />);
    await goToParentCredentials();
    const name = screen.getByLabelText("Your Name");
    expect(name).toHaveAttribute("name", "full_name");
    expect(name).toHaveAttribute("maxLength", "80");
    expect(screen.getByText("Your child sees this name once you're connected.")).toBeInTheDocument();
  });

  it("calls onSubmit once credentials and phone are filled", async () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    render(<Harness onSubmit={onSubmit} />);
    await goToParentCredentials();
    fillParentCredentials();
    fireEvent.change(screen.getByPlaceholderText("10-digit mobile number"), {
      target: { value: "9876543210" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("blocks submission and surfaces an error when passwords do not match", async () => {
    const onSubmit = vi.fn((e: FormEvent<HTMLFormElement>) => e.preventDefault());
    render(<Harness onSubmit={onSubmit} />);
    await goToParentCredentials();
    fillParentCredentials();
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "different" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
