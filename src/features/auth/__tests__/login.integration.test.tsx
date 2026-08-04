import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { makeAuthToken } from "@/test/fixtures/authToken";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useStudentStore } from "@/features/student/store/useStudentStore";

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

import LoginPage from "@/app/login/page";
import { GlobalLoader } from "@/components/shared/loaders/GlobalLoader";

autoResetStore(useStudentStore);

// Post-auth redirect is handed off to GlobalLoader (normally mounted once in
// the root layout) — mount it alongside the page so the celebration timing
// that gates navigation actually runs, matching the real app tree.
function renderLoginPage() {
  return render(
    <>
      <GlobalLoader />
      <LoginPage />
    </>,
  );
}

function fillAndSubmit(container: HTMLElement, username = "ada", password = "password123") {
  fireEvent.change(container.querySelector('input[name="username"]')!, { target: { value: username } });
  fireEvent.change(container.querySelector('input[name="password"]')!, { target: { value: password } });
  fireEvent.submit(container.querySelector("form")!);
}

beforeEach(() => {
  localStorage.clear();
  Object.values(routerMock).forEach((fn) => fn.mockReset());
  window.history.pushState({}, "", "/login");
});

describe("login flow (integration)", () => {
  it("persists the token/profile/role and redirects to the role home on success", async () => {
    const { container } = renderLoginPage();

    fillAndSubmit(container);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/student"), { timeout: 4000 });
    expect(localStorage.getItem("gened_auth_token")).toBe("test-jwt");
    expect(localStorage.getItem("gened_user_role")).toBe("student");
    expect(JSON.parse(localStorage.getItem("gened_user_profile")!).user_id).toBe("u_student");
    expect(useStudentStore.getState().studentProfile?.user_id).toBe("u_student");
  });

  it("honors a ?redirect= target instead of the role home", async () => {
    window.history.pushState({}, "", "/login?redirect=%2Fstudent%2Fanalytics");
    const { container } = renderLoginPage();

    fillAndSubmit(container);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/student/analytics"), { timeout: 4000 });
  });

  it("routes a teacher to the teacher home", async () => {
    server.use(
      http.post(`${BASE}/auth/sign-in`, () => HttpResponse.json(makeAuthToken({ role: "teacher", user_id: "u_t" }))),
    );
    const { container } = renderLoginPage();

    fillAndSubmit(container);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/teacher"), { timeout: 4000 });
  });

  it("persists an admin role and routes to the admin console", async () => {
    server.use(
      http.post(`${BASE}/auth/sign-in`, () =>
        HttpResponse.json(makeAuthToken({ role: "ADMIN", user_id: "u_admin" })),
      ),
    );
    const { container } = renderLoginPage();

    fillAndSubmit(container, "GenEd Admin");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/admin"), { timeout: 4000 });
    expect(localStorage.getItem("gened_user_role")).toBe("admin");
    expect(JSON.parse(localStorage.getItem("gened_user_profile")!).user_id).toBe("u_admin");
    expect(useStudentStore.getState().studentProfile).toBeNull();
  });

  it("shows the server error message and does not redirect on 401", async () => {
    server.use(
      http.post(`${BASE}/auth/sign-in`, () =>
        HttpResponse.json({ message: "Invalid username or password" }, { status: 401 }),
      ),
    );
    const { container } = renderLoginPage();

    fillAndSubmit(container);

    await waitFor(() => expect(screen.getByText("Invalid username or password")).toBeInTheDocument());
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem("gened_auth_token")).toBeNull();
  });
});
