/**
 * Smoke test for the shared test helpers. Proves the Phase 0 infrastructure works and
 * doubles as the copy-template for how Phase 1 suites should use these helpers.
 */
import { describe, it, expect, vi } from "vitest";
import { create } from "zustand";

import { installLocationStub } from "../location";
import { seedAuthLocalStorage, clearAuthLocalStorage } from "../auth";
import { createNextNavigationMock } from "../nextNavigation";
import { autoResetStore } from "../resetStores";

describe("installLocationStub", () => {
  it("makes window.location.href writable and readable", () => {
    const stub = installLocationStub();
    window.location.href = "/?error=session_expired";
    expect(window.location.href).toBe("/?error=session_expired");
    expect(stub.href).toBe("/?error=session_expired");
  });
});

describe("seedAuthLocalStorage / clearAuthLocalStorage", () => {
  it("writes the three gened_* keys and clears them", () => {
    const { profile } = seedAuthLocalStorage("student", { profile: { user_id: "u_42" } });
    expect(localStorage.getItem("gened_auth_token")).toBe("test-token");
    expect(localStorage.getItem("gened_user_role")).toBe("student");
    const stored = JSON.parse(localStorage.getItem("gened_user_profile")!);
    expect(stored.user_id).toBe("u_42");
    expect(profile.user_id).toBe("u_42");

    clearAuthLocalStorage();
    expect(localStorage.getItem("gened_auth_token")).toBeNull();
    expect(localStorage.getItem("gened_user_profile")).toBeNull();
    expect(localStorage.getItem("gened_user_role")).toBeNull();
  });
});

describe("createNextNavigationMock", () => {
  it("exposes a router with spy methods and the given pathname", () => {
    const nav = createNextNavigationMock({ pathname: "/student" });
    nav.useRouter().push("/somewhere");
    expect(nav.router.push).toHaveBeenCalledWith("/somewhere");
    expect(nav.usePathname()).toBe("/student");
    expect(vi.isMockFunction(nav.router.replace)).toBe(true);
  });
});

describe("autoResetStore", () => {
  const useCounter = create<{ n: number; inc: () => void }>((set) => ({
    n: 0,
    inc: () => set((s) => ({ n: s.n + 1 })),
  }));
  autoResetStore(useCounter);

  // These two tests run in definition order; the second only passes if the afterEach
  // installed by autoResetStore restored the mutation made in the first.
  it("first test mutates the store", () => {
    useCounter.getState().inc();
    expect(useCounter.getState().n).toBe(1);
  });

  it("second test sees state reset to its initial value", () => {
    expect(useCounter.getState().n).toBe(0);
  });
});
