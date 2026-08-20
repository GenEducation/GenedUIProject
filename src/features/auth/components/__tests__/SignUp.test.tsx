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
//
// The card no longer carries step headings or a "Step n of m" counter, so each
// step is identified by a field unique to it.

/** Pick a grade from the shared Select (replaced the old 1..12 button grid). */
async function selectGrade(label: string) {
  fireEvent.click(screen.getByRole("combobox", { name: /what grade are you in/i }));
  const option = await screen.findByRole("option", { name: label });
  fireEvent.click(option);
}

describe("SignUp — role selection", () => {
  it("starts on the role-select step and advances to student details on click", async () => {
    render(<Harness />);
    expect(screen.getByText(/select your role to get started/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /\bstudent\b/i }));

    await waitFor(() => expect(screen.getByText("What grade are you in?")).toBeInTheDocument());
  });

  it("advances to the parent credentials step on Parent click", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /\bparent\b/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText("scholar@gened.edu")).toBeInTheDocument(),
    );
  });
});

describe("SignUp — student flow", () => {
  async function goToStudentStep2() {
    fireEvent.click(screen.getByRole("button", { name: /\bstudent\b/i }));
    await waitFor(() => expect(screen.getByText("What grade are you in?")).toBeInTheDocument());
  }

  it("disables submit until a grade is picked, then enables it", async () => {
    render(<Harness />);
    await goToStudentStep2();

    const submit = screen.getByRole("button", { name: /create account/i });
    expect(submit).toBeDisabled();

    await selectGrade("Grade 6");
    expect(submit).not.toBeDisabled();
  });

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
    fireEvent.change(screen.getByPlaceholderText("Create a password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "secret1" },
    });
    await selectGrade("Grade 6");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
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
    await waitFor(() =>
      expect(screen.getByPlaceholderText("scholar@gened.edu")).toBeInTheDocument(),
    );
  }

  function fillParentCredentials() {
    fireEvent.change(screen.getByPlaceholderText("scholar@gened.edu"), {
      target: { value: "parent@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a password"), {
      target: { value: "secret1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm your password"), {
      target: { value: "secret1" },
    });
  }

  it("collects phone alongside credentials on the same step", async () => {
    render(<Harness />);
    await goToParentCredentials();

    // Phone used to live on a third step; the flow is two steps for both roles now.
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(screen.queryByText(/step \d of \d/i)).not.toBeInTheDocument();
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
