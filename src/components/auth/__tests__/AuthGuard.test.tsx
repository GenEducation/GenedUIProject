import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useStudentStore } from "@/features/student/store/useStudentStore";

// Hoisted so the next/navigation factory (also hoisted) can close over it, and the
// tests can assert on router.replace.
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

import { AuthGuard } from "../AuthGuard";

autoResetStore(useStudentStore);

const SECRET = "PROTECTED_CONTENT";
const renderGuard = (role: Parameters<typeof AuthGuard>[0]["requiredRole"]) =>
  render(
    <AuthGuard requiredRole={role}>
      <div>{SECRET}</div>
    </AuthGuard>,
  );

beforeEach(() => {
  localStorage.clear();
  Object.values(routerMock).forEach((fn) => fn.mockReset());
  window.history.pushState({}, "", "/student");
});

describe("AuthGuard — unauthenticated", () => {
  it("redirects to login with an encoded redirect when the token is missing", async () => {
    window.history.pushState({}, "", "/student/analytics");

    renderGuard("student");

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/?redirect=%2Fstudent%2Fanalytics"),
    );
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
    expect(screen.getByAltText("Logo")).toBeInTheDocument(); // spinner
  });

  it("redirects when the role is missing even if a token exists", async () => {
    localStorage.setItem("gened_auth_token", "tok");
    localStorage.setItem("gened_user_profile", JSON.stringify({ user_id: "u_1" }));

    renderGuard("student");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/?redirect=%2Fstudent"));
  });
});

describe("AuthGuard — role mismatch", () => {
  it("sends a student on a teacher route back to their own portal", async () => {
    seedAuthLocalStorage("student");

    renderGuard("teacher");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/student"));
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
  });

  it("clears the session when a student hits a parent route (special case)", async () => {
    seedAuthLocalStorage("student");
    window.history.pushState({}, "", "/parent/dashboard");

    renderGuard("parent");

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/?redirect=%2Fparent%2Fdashboard"),
    );
    expect(localStorage.getItem("gened_auth_token")).toBeNull();
  });
});

describe("AuthGuard — corrupt profile", () => {
  it("clears storage and redirects to / when the profile JSON is invalid", async () => {
    localStorage.setItem("gened_auth_token", "tok");
    localStorage.setItem("gened_user_role", "student");
    localStorage.setItem("gened_user_profile", "{not valid json");

    renderGuard("student");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(localStorage.getItem("gened_auth_token")).toBeNull();
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
  });
});

describe("AuthGuard — authorized", () => {
  it("renders children and hydrates the student store on a role match", async () => {
    seedAuthLocalStorage("student", { profile: { user_id: "u_42", name: "Ada", grade: 6 } });

    renderGuard("student");

    await waitFor(() => expect(screen.getByText(SECRET)).toBeInTheDocument());
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(useStudentStore.getState().studentProfile?.user_id).toBe("u_42");
  });

  it("does not re-hydrate when the store already holds the same user", async () => {
    useStudentStore.getState().setStudentProfile({ user_id: "u_42", username: "existing" } as never);
    const setSpy = vi.spyOn(useStudentStore.getState(), "setStudentProfile");
    seedAuthLocalStorage("student", { profile: { user_id: "u_42" } });

    renderGuard("student");

    await waitFor(() => expect(screen.getByText(SECRET)).toBeInTheDocument());
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });
});
