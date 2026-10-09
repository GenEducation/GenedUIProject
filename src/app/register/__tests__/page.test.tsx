import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { SignUpFields } from "@/features/auth/authService";

// Capture what the page hands the form; the form itself is tested elsewhere.
const seen: SignUpFields[] = [];
vi.mock("@/features/auth/components/SignUp", () => ({
  SignUp: ({ signupData }: { signupData: SignUpFields }) => {
    seen.push(signupData);
    return null;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import RegisterPage from "../page";

afterEach(() => {
  seen.length = 0;
  window.history.replaceState(null, "", "/");
});

describe("register page — a school's join link", () => {
  it("pre-fills partner_id from ?partner=", async () => {
    window.history.replaceState(null, "", "/register?partner=c2a1-school");
    render(<RegisterPage />);
    await waitFor(() => expect(seen.at(-1)?.partner_id).toBe("c2a1-school"));
  });

  it("leaves partner_id unset without the link (the student joins GenEd)", async () => {
    window.history.replaceState(null, "", "/register");
    render(<RegisterPage />);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen.at(-1)?.partner_id).toBeUndefined();
  });
});
