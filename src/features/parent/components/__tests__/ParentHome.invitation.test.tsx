import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useParentStore } from "../../store/useParentStore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

// The parent opened the invitation link from their email, signed in.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/parent",
  useSearchParams: () => new URLSearchParams("token=t1&student_id=s1"),
}));
vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="lazy-view" /> }));
vi.mock("../ParentChatExploration", () => ({ ParentChatExploration: () => <div>chat view</div> }));
vi.mock("../ParentScheduleView", () => ({ ParentScheduleView: () => <div>schedule view</div> }));
vi.mock("../ParentMomentsView", () => ({ ParentMomentsView: () => <div>moments view</div> }));
vi.mock("../settings/ParentSettingsView", () => ({ ParentSettingsView: () => <div>profile view</div> }));
vi.mock("../home/ParentHomeView", () => ({ ParentHomeView: () => <div>home view</div> }));
vi.mock("@/components/NotificationBell", () => ({ NotificationBell: () => null }));

import { ParentHome } from "../ParentHome";

autoResetStore(useParentStore);

let confirmed: Record<string, unknown> | null;

beforeEach(() => {
  confirmed = null;
  localStorage.clear();
  sessionStorage.clear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
  useParentStore.getState().setParentProfile({ user_id: "p1", username: "mom", email: "M@x.com ", role: "parent" });
  server.use(
    http.get(`${BASE}/parent/students`, () => HttpResponse.json([])),
    http.post(`${BASE}/parent/confirm-link`, async ({ request }) => {
      confirmed = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ student_id: "s1", parent_id: "p1", status: "APPROVED", requested_at: "now" });
    }),
  );
});

describe("ParentHome — the emailed invitation", () => {
  it("explains what the parent is confirming and links nothing until they say yes", async () => {
    render(<ParentHome />);
    expect(await screen.findByRole("heading", { name: "Are you Aarav's parent or guardian?" })).toBeInTheDocument();
    expect(screen.getByText(/you state that you are Aarav's parent or legal guardian/i)).toBeInTheDocument();
    expect(screen.getByText(/remove the connection in Settings/i)).toBeInTheDocument();
    expect(confirmed).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Yes, I'm Aarav's parent or guardian" }));

    await waitFor(() => expect(confirmed).toEqual({ student_id: "s1", parent_id: "p1", token: "t1", guardian_confirmed: true }));
    expect(await screen.findByText(/You're connected/)).toBeInTheDocument();
  });

  it("Not now sets the invitation aside without linking", async () => {
    render(<ParentHome />);
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: /parent or guardian\?/ })).not.toBeInTheDocument());
    expect(confirmed).toBeNull();
  });

  it("signed in with another address, the parent is told which one and cannot confirm", async () => {
    useParentStore.getState().setParentProfile({ user_id: "p1", username: "aunt", email: "aunt@x.com", role: "parent" });
    render(<ParentHome />);
    expect(await screen.findByRole("heading", { name: "This invitation is for another email address" })).toBeInTheDocument();
    expect(screen.getByText(/You're signed in as/)).toHaveTextContent("aunt@x.com");
    expect(screen.queryByRole("button", { name: /Yes, I'm/ })).not.toBeInTheDocument();
    expect(confirmed).toBeNull();
  });

  it("shows the backend's refusal, e.g. an expired link", async () => {
    server.use(
      http.get(`${BASE}/parent/verify-token`, () =>
        HttpResponse.json({ message: "Confirmation token has expired." }, { status: 400 }),
      ),
    );
    render(<ParentHome />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Confirmation token has expired.");
  });

  it("tells the parent when a child who named them already has another guardian", async () => {
    server.use(
      http.get(`${BASE}/parent/guardian/invitations`, () =>
        HttpResponse.json([{ student_id: "s7", student_name: "Kabir", state: "other_guardian" }]),
      ),
    );
    render(<ParentHome />);
    expect(await screen.findByRole("note")).toHaveTextContent("Kabir named your email");
  });
});
