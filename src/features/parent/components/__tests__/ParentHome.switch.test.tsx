import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useParentStore } from "../../store/useParentStore";
import { hasEnteredPortal, markPortalEntered } from "../../utils/portalEntry";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), pathname: "/parent/s1/chat" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

// The dashboard views are covered elsewhere; here they only need to exist.
vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="lazy-view" /> }));
// Every render of a view is logged, so a test can tell if a stale page was drawn even once.
const renders = vi.hoisted(() => [] as string[]);
vi.mock("../ParentChatExploration", () => ({ ParentChatExploration: () => { renders.push("chat"); return <div>chat view</div>; } }));
vi.mock("../ParentScheduleView", () => ({ ParentScheduleView: () => <div>schedule view</div> }));
vi.mock("../ParentMomentsView", () => ({ ParentMomentsView: () => { renders.push("moments"); return <div>moments view</div>; } }));
vi.mock("../settings/ParentSettingsView", () => ({ ParentSettingsView: () => <div>profile view</div> }));
vi.mock("@/components/NotificationBell", () => ({ NotificationBell: () => null }));

import { ParentHome, routeFromPath } from "../ParentHome";

autoResetStore(useParentStore);

const kid = (id: string, name: string) => ({ student_id: id, parent_id: "p1", status: "APPROVED", requested_at: "now", name });

function linkChildren(children: ReturnType<typeof kid>[]) {
  server.use(
    http.get(`${BASE}/parent/students`, () => HttpResponse.json(children)),
    // No session history: nobody has new activity.
    http.post(`${BASE}/get-session`, () => HttpResponse.json({ sessions: [] })),
    // Supporting data for the picker and Home; empty is enough here.
    http.get(`${BASE}/students/:id/profile`, () => HttpResponse.json({ grade: 7 })),
    http.get(`${BASE}/api/students/:id/available-agents`, () => HttpResponse.json({ partners: [] })),
    http.get(`${BASE}/students/:id/time/by-period`, () => HttpResponse.json([])),
    http.get(`${BASE}/students/:id/time/by-chapter`, () => HttpResponse.json([])),
  );
}

beforeEach(() => {
  nav.push.mockClear();
  nav.replace.mockClear();
  nav.pathname = "/parent/s1/chat";
  localStorage.clear();
  sessionStorage.clear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
  useParentStore.getState().setParentProfile({ user_id: "p1", username: "mom", email: "m@x.com", role: "parent" });
});

describe("ParentHome — opening the portal", () => {
  const twoKids = () => linkChildren([kid("s1", "Aarav"), kid("s2", "Priya")]);
  const picker = () => screen.findByRole("heading", { name: /who are you checking on today/i });

  it("a new tab starts at the picker, even when it opens on a child's page", async () => {
    twoKids();
    render(<ParentHome />);
    expect(await picker()).toBeInTheDocument();
  });

  it("picking the child the tab opened on carries on to that page", async () => {
    twoKids();
    render(<ParentHome />);
    fireEvent.click(await screen.findByRole("button", { name: "View Aarav's dashboard" }));

    expect(await screen.findByText("chat view")).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    expect(hasEnteredPortal()).toBe(true);
  });

  it("a refresh after the picker keeps the current page", async () => {
    twoKids();
    markPortalEntered();
    render(<ParentHome />);

    expect(await screen.findByText("chat view")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /who are you checking on today/i })).not.toBeInTheDocument();
  });

  it("a new login in the same tab starts at the picker again", async () => {
    twoKids();
    markPortalEntered();
    localStorage.setItem("gened_auth_token", "a-different-session");
    render(<ParentHome />);
    expect(await picker()).toBeInTheDocument();
  });

  it("a single-child account skips the picker and counts as entered", async () => {
    linkChildren([kid("s1", "Aarav")]);
    render(<ParentHome />);

    expect(await screen.findByText("chat view")).toBeInTheDocument();
    await waitFor(() => expect(hasEnteredPortal()).toBe(true));
  });
});

describe("ParentHome — hidden sections", () => {
  it("a typed /schedule URL lands on the child's Home while schedule is switched off", async () => {
    linkChildren([kid("s1", "Aarav")]);
    nav.pathname = "/parent/s1/schedule";
    render(<ParentHome />);

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/parent/s1"));
    expect(screen.queryByText("schedule view")).not.toBeInTheDocument();
    expect(useParentStore.getState().activeDashboardView).toBe("analytics");
  });
});

describe("ParentHome — top bar", () => {
  beforeEach(() => markPortalEntered());

  it("greets the parent and names the child being viewed", async () => {
    linkChildren([kid("s1", "Aarav"), kid("s2", "Priya")]);
    useParentStore.getState().setParentProfile({ user_id: "p1", username: "ramesh", email: "m@x.com", role: "parent" });
    render(<ParentHome />);

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("heading", { level: 1 })).toHaveTextContent(/^Good (morning|afternoon|evening), Ramesh!/);
    expect(await within(banner).findByText("Here's how Aarav is doing on their learning journey.")).toBeInTheDocument();
  });
});

describe("ParentHome — sidebar Switch", () => {
  beforeEach(() => markPortalEntered());

  it("with two children, flips straight to the other child in the same section", async () => {
    linkChildren([kid("s1", "Aarav"), kid("s2", "Priya")]);
    render(<ParentHome />);

    fireEvent.click(await screen.findByRole("button", { name: "Switch to Priya" }));
    expect(nav.push).toHaveBeenCalledWith("/parent/s2/chat");
  });

  it("keeps the open subject when switching", async () => {
    linkChildren([kid("s1", "Aarav"), kid("s2", "Priya")]);
    nav.pathname = "/parent/s1/subject/Mathematics";
    render(<ParentHome />);

    fireEvent.click(await screen.findByRole("button", { name: "Switch to Priya" }));
    expect(nav.push).toHaveBeenCalledWith("/parent/s2/subject/Mathematics");
  });

  it("with three or more children, offers a menu that switches in place or opens the picker", async () => {
    linkChildren([kid("s1", "Aarav"), kid("s2", "Priya"), kid("s3", "Rohan")]);
    render(<ParentHome />);

    fireEvent.click(await screen.findByRole("button", { name: /^Switch Account/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Rohan/ }));
    expect(nav.push).toHaveBeenCalledWith("/parent/s3/chat");

    fireEvent.click(screen.getByRole("button", { name: /^Switch Account/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "See all profiles" }));
    expect(nav.push).toHaveBeenLastCalledWith("/parent");
  });
});

describe("ParentHome — first run with no child connected", () => {
  const dialog = () => screen.findByRole("dialog", { name: "Let's connect your child" });

  it("'later' hides it for this login, and the empty Home can bring it back", async () => {
    linkChildren([]);
    nav.pathname = "/parent";
    const { unmount } = render(<ParentHome />);

    fireEvent.click(within(await dialog()).getByRole("button", { name: "I'll do this later" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // a refresh in the same login stays quiet
    unmount();
    render(<ParentHome />);
    expect(await screen.findByText("Link your child to get started")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show me how" }));
    expect(await dialog()).toBeInTheDocument();
  });

  it("lets the parent approve a waiting request right in the popup", async () => {
    linkChildren([{ ...kid("s9", "Kabir"), status: "PENDING" }]);
    server.use(
      http.patch(`${BASE}/parent/link/:id/status`, () =>
        HttpResponse.json({ ...kid("s9", "Kabir") }),
      ),
    );
    nav.pathname = "/parent";
    render(<ParentHome />);

    fireEvent.click(within(await dialog()).getByRole("button", { name: "Approve Kabir" }));
    fireEvent.click(within(await dialog()).getByRole("button", { name: /yes, i'm their parent or guardian/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("ParentHome — following the URL", () => {
  beforeEach(() => markPortalEntered());

  it("shows the new page on the very first render after the URL changes", async () => {
    linkChildren([kid("s1", "Aarav")]);
    const { rerender } = render(<ParentHome />);
    expect(await screen.findByText("chat view")).toBeInTheDocument();

    // A sidebar click: the layout stays mounted and only the URL changes.
    renders.length = 0;
    nav.pathname = "/parent/s1/moments";
    rerender(<ParentHome />);
    // The old page must not be drawn again, even for one render.
    expect(renders).not.toContain("chat");
    expect(screen.getByText("moments view")).toBeInTheDocument();
    expect(screen.queryByText("chat view")).not.toBeInTheDocument();
  });

  it("trusts the URL over a stale view left in the store", async () => {
    linkChildren([kid("s1", "Aarav")]);
    useParentStore.setState({ activeDashboardView: "moments", selectedStudentId: "s1" });
    render(<ParentHome />);
    expect(await screen.findByText("chat view")).toBeInTheDocument();
    expect(screen.queryByText("moments view")).not.toBeInTheDocument();
  });
});

describe("routeFromPath", () => {
  it.each([
    ["/parent", { view: null, studentId: null }],
    ["/parent/settings", { view: "profile", studentId: null }],
    ["/parent/s1/subject/Mathematics", { view: "subject", studentId: "s1" }],
  ])("%s", (path, expected) => {
    expect(routeFromPath(path)).toEqual(expected);
  });
});
