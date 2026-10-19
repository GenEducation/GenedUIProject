import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import type { LinkedStudent } from "../../services/parentService";
import { readSeen } from "../../utils/studentActivity";
import { ParentStudentSwitcher } from "../ParentStudentSwitcher";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const SEEN_KEY = "gened_parent_seen_students:p1";
const HOUR = 60 * 60 * 1000;

const kid = (id: string, name: string): LinkedStudent => ({
  student_id: id, parent_id: "p1", status: "APPROVED", requested_at: "now", name,
});
const kids = [kid("s1", "Aarav"), kid("s2", "Priya"), kid("s3", "Rohan"), kid("s4", "Meera")];
const avatars = { s1: "/a1.png", s2: "/a2.png", s3: "/a3.png", s4: "/a4.png" };

/** Latest session time per child; children not listed have no sessions. */
function sessionsAt(latest: Record<string, number>) {
  server.use(
    http.post(`${BASE}/get-session`, async ({ request }) => {
      const { user_id } = (await request.json()) as { user_id: string };
      const at = latest[user_id];
      return HttpResponse.json({
        sessions: at ? [{ session_id: "x", created_at: new Date(at - HOUR).toISOString(), updated_at: new Date(at).toISOString() }] : [],
      });
    }),
  );
}

function renderSwitcher(overrides: Partial<React.ComponentProps<typeof ParentStudentSwitcher>> = {}) {
  const props = {
    parentId: "p1", currentStudentId: "s1", students: kids, avatars,
    onSwitch: vi.fn(), onSeeAll: vi.fn(), ...overrides,
  };
  return { ...render(<ParentStudentSwitcher {...props} />), props };
}

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
  sessionsAt({});
});

describe("ParentStudentSwitcher", () => {
  it("marks the child being viewed as seen", () => {
    renderSwitcher();
    expect(readSeen("p1").s1).toBeGreaterThan(Date.now() - 1000);
  });

  it("puts the most recently viewed child first and focused, so Enter goes back to them", async () => {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, JSON.stringify({ s2: now - 5 * HOUR, s3: now - HOUR }));
    const { props } = renderSwitcher();

    fireEvent.click(screen.getByRole("button", { name: "Switch Account" }));
    const first = screen.getAllByRole("menuitem")[0];
    expect(first).toHaveTextContent("Rohan");
    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.click(first);
    expect(props.onSwitch).toHaveBeenCalledWith("s3");
  });

  it("lists children with new activity first, then by recency", async () => {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, JSON.stringify({ s2: now - HOUR, s3: now - 2 * HOUR, s4: now - 3 * HOUR }));
    sessionsAt({ s4: now - 10 * 60 * 1000 }); // Meera did something after the parent last looked
    renderSwitcher();

    const toggle = await screen.findByRole("button", { name: "Switch Account, 1 with new activity" });
    fireEvent.click(toggle);

    const rows = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(rows).toEqual([
      "MeeraNew activity",
      "PriyaViewed 1h ago",
      "RohanViewed 2h ago",
      "See all profiles",
    ]);
  });

  it("doesn't flag activity the parent has already seen", async () => {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, JSON.stringify({ s2: now - 10 * 60 * 1000 }));
    sessionsAt({ s2: now - HOUR });
    renderSwitcher({ students: kids.slice(0, 2) });

    await waitFor(() => expect(screen.getByRole("button", { name: "Switch to Priya" })).toBeInTheDocument());
  });

  it("with two children, flips straight to the other and flags new activity", async () => {
    sessionsAt({ s2: Date.now() - 60 * 1000 });
    const { props } = renderSwitcher({ students: kids.slice(0, 2) });

    fireEvent.click(await screen.findByRole("button", { name: "Switch to Priya, new activity" }));
    expect(props.onSwitch).toHaveBeenCalledWith("s2");
  });

  it("closes the menu on Escape and hands focus back", () => {
    renderSwitcher();
    const toggle = screen.getByRole("button", { name: /^Switch Account/ });
    fireEvent.click(toggle);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    return waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(toggle).toHaveFocus();
    });
  });

  it("See all profiles hands off to the picker", () => {
    const { props } = renderSwitcher();
    fireEvent.click(screen.getByRole("button", { name: /^Switch Account/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "See all profiles" }));
    expect(props.onSeeAll).toHaveBeenCalled();
  });
});
