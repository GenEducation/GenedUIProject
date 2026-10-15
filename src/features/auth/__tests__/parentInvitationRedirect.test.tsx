import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { FormEvent } from "react";

import { server } from "@/test/msw/server";
import { makeAuthToken } from "@/test/fixtures/authToken";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useLoaderStore } from "@/stores/useLoaderStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { safeRedirect } from "../usePostAuthRedirect";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

// The register form is covered by its own tests; here it is only a submit button.
// The register form is covered by its own tests; here it fills in a parent and submits.
const PARENT_FIELDS: Record<string, string> = {
  role: "parent",
  email: "mum@example.com",
  password: "Mangoes7",
  confirmPassword: "Mangoes7",
  phone: "9999999999",
  full_name: "Mum Synthetic",
  otp_code: "123456",
};
vi.mock("@/features/auth/components/SignUp", () => ({
  SignUp: ({
    onSubmit,
    onChange,
    onSwitchToSignin,
    errors,
  }: {
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    onChange: (e: { target: { name: string; value: string } }) => void;
    onSwitchToSignin: () => void;
    errors?: Record<string, string>;
  }) => (
    <form onSubmit={onSubmit}>
      <button
        type="button"
        onClick={() => Object.entries(PARENT_FIELDS).forEach(([name, value]) => onChange({ target: { name, value } }))}
      >
        Fill as parent
      </button>
      <button type="button" onClick={() => onChange({ target: { name: "full_name", value: "   " } })}>
        Clear the name
      </button>
      {errors?.full_name && <p role="alert">{errors.full_name}</p>}
      <button type="submit">Create Account</button>
      <button type="button" onClick={onSwitchToSignin}>Log in instead</button>
    </form>
  ),
}));

import HomePage from "@/app/page";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import { GlobalLoader } from "@/components/shared/loaders/GlobalLoader";

autoResetStore(useLoaderStore);
autoResetStore(useParentStore);

// Where AuthGuard sends a signed-out parent who opened their invitation email.
const INVITE = "/parent?token=t1&student_id=s1";
const encoded = encodeURIComponent(INVITE);

beforeEach(() => {
  localStorage.clear();
  Object.values(routerMock).forEach((fn) => fn.mockReset());
});

describe("safeRedirect", () => {
  it("keeps in-app paths and refuses other sites", () => {
    expect(safeRedirect(INVITE)).toBe(INVITE);
    expect(safeRedirect("//evil.example/parent")).toBeNull();
    expect(safeRedirect("/\\evil.example")).toBeNull();
    expect(safeRedirect("https://evil.example")).toBeNull();
    expect(safeRedirect(null)).toBeNull();
  });

  it("keeps a signed-in role inside its own area", () => {
    expect(safeRedirect(INVITE, "parent")).toBe(INVITE);
    expect(safeRedirect(INVITE, "student")).toBeNull();
    expect(safeRedirect("/student/analytics", "STUDENT")).toBe("/student/analytics");
    expect(safeRedirect("/pricing", "student")).toBe("/pricing");
  });
});

describe("a parent's invitation link survives landing → log in / sign up", () => {
  beforeEach(() => {
    // The landing page reveals sections on scroll; jsdom has no IntersectionObserver.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    return () => vi.unstubAllGlobals();
  });

  it("the landing page's Log in and Get started carry the invitation on", async () => {
    window.history.pushState({}, "", `/?redirect=${encoded}`);
    render(<HomePage />);
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute("href", `/login?redirect=${encoded}`),
    );
    for (const link of screen.getAllByRole("link", { name: /get started/i })) {
      expect(link).toHaveAttribute("href", `/register?redirect=${encoded}`);
    }
  });

  it("the landing page drops a redirect to another site", async () => {
    window.history.pushState({}, "", `/?redirect=${encodeURIComponent("//evil.example")}`);
    render(<HomePage />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute("href", "/login"));
  });

  it("logging in as a parent returns to the invitation", async () => {
    server.use(http.post(`${BASE}/auth/sign-in`, () => HttpResponse.json(makeAuthToken({ role: "parent", user_id: "p1" }))));
    window.history.pushState({}, "", `/login?redirect=${encoded}`);
    const { container } = render(<><GlobalLoader /><LoginPage /></>);
    fireEvent.change(container.querySelector('input[name="username"]')!, { target: { value: "mum@example.com" } });
    fireEvent.change(container.querySelector('input[name="password"]')!, { target: { value: "Password1" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(INVITE), { timeout: 4000 });
  });

  it("a student who logs in from a parent's link goes to their own home, not the parent portal", async () => {
    window.history.pushState({}, "", `/login?redirect=${encoded}`);
    const { container } = render(<><GlobalLoader /><LoginPage /></>);
    fireEvent.change(container.querySelector('input[name="username"]')!, { target: { value: "ada" } });
    fireEvent.change(container.querySelector('input[name="password"]')!, { target: { value: "Password1" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/student"), { timeout: 4000 });
  });

  it("/login's Sign up keeps the invitation, and /register's Log in does too", async () => {
    window.history.pushState({}, "", `/login?redirect=${encoded}`);
    const { unmount } = render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(routerMock.push).toHaveBeenCalledWith(`/register?redirect=${encoded}`);
    unmount();

    window.history.pushState({}, "", `/register?redirect=${encoded}`);
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Log in instead" }));
    expect(routerMock.push).toHaveBeenCalledWith(`/login?redirect=${encoded}`);
  });

  it("a parent cannot sign up without their name", async () => {
    let posted = false;
    server.use(http.post(`${BASE}/auth/sign-up`, () => { posted = true; return HttpResponse.json(makeAuthToken({ role: "parent", user_id: "p1" })); }));
    window.history.pushState({}, "", `/register?redirect=${encoded}`);
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole("button", { name: "Fill as parent" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear the name" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your name is compulsory");
    expect(posted).toBe(false);
  });

  it("signing up as a parent returns to the invitation's confirmation screen", async () => {
    server.use(http.post(`${BASE}/auth/sign-up`, () => HttpResponse.json(makeAuthToken({ role: "parent", user_id: "p1" }))));
    window.history.pushState({}, "", `/register?redirect=${encoded}`);
    render(<><GlobalLoader /><RegisterPage /></>);
    fireEvent.click(screen.getByRole("button", { name: "Fill as parent" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(INVITE), { timeout: 4000 });
  });
});
