import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { makeAuthToken } from "@/test/fixtures/authToken";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useLoaderStore } from "@/stores/useLoaderStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { LoginView } from "../LoginView";
import { GlobalLoader } from "@/components/shared/loaders/GlobalLoader";

autoResetStore(useLoaderStore);

beforeEach(() => {
  localStorage.clear();
  Object.values(routerMock).forEach((fn) => fn.mockReset());
  window.history.pushState({}, "", "/");
});

function signIn(container: HTMLElement) {
  const form = container.querySelector('input[name="password"]')!.closest("form")!;
  fireEvent.change(form.querySelector('input[name="username"]')!, { target: { value: "ada" } });
  fireEvent.change(form.querySelector('input[name="password"]')!, { target: { value: "password123" } });
  fireEvent.submit(form);
}

describe("LoginView (landing page) — loader hand-off", () => {
  it("hands a parent over to the hat loader, as /login does", async () => {
    server.use(
      http.post(`${BASE}/auth/sign-in`, () => HttpResponse.json(makeAuthToken({ role: "parent", user_id: "u_p" }))),
    );
    let variantAtNavigation: string | null = null;
    routerMock.replace.mockImplementation(() => {
      variantAtNavigation = useLoaderStore.getState().variant;
    });
    const { container } = render(<><GlobalLoader /><LoginView /></>);

    signIn(container);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/parent"), { timeout: 4000 });
    expect(variantAtNavigation).toBe("parent");
    expect(useLoaderStore.getState().parentStage).toBe("signin-handoff");
  });

  it("keeps the shared loader for a student", async () => {
    server.use(
      http.post(`${BASE}/auth/sign-in`, () => HttpResponse.json(makeAuthToken({ role: "student", user_id: "u_s" }))),
    );
    let variantAtNavigation: string | null = null;
    routerMock.replace.mockImplementation(() => {
      variantAtNavigation = useLoaderStore.getState().variant;
    });
    const { container } = render(<><GlobalLoader /><LoginView /></>);

    signIn(container);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/student"), { timeout: 4000 });
    expect(variantAtNavigation).toBe("default");
  });

  it("puts up no loader while signing in, so a parent never sees the student one first", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    server.use(
      http.post(`${BASE}/auth/sign-in`, async () => {
        await gate;
        return HttpResponse.json(makeAuthToken({ role: "parent", user_id: "u_p" }));
      }),
    );
    const seen: string[] = [];
    const unsub = useLoaderStore.subscribe((st) => { if (st.isVisible) seen.push(st.variant); });
    const { container } = render(<><GlobalLoader /><LoginView /></>);

    signIn(container);
    await new Promise((r) => setTimeout(r, 150));
    expect(useLoaderStore.getState().isVisible).toBe(false); // the button spinner covers the request

    release();
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/parent"), { timeout: 4000 });
    unsub();
    expect(seen.length).toBeGreaterThan(0);
    expect(new Set(seen)).toEqual(new Set(["parent"])); // only ever the hat loader
  });

  it("gives a partner the GenEd logo loader with school wording", async () => {
    server.use(
      http.post(`${BASE}/auth/sign-in`, () => HttpResponse.json(makeAuthToken({ role: "partner", user_id: "u_x" }))),
    );
    let atNavigation: { variant: string; stage: string } | null = null;
    routerMock.replace.mockImplementation(() => {
      const st = useLoaderStore.getState();
      atNavigation = { variant: st.variant, stage: st.parentStage };
    });
    const { container } = render(<><GlobalLoader /><LoginView /></>);

    signIn(container);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/partner"), { timeout: 4000 });
    expect(atNavigation).toEqual({ variant: "parent", stage: "partner-signin" });
  });
});
