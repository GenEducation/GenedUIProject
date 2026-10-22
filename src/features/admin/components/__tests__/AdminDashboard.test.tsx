import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from "@testing-library/react";

import { AdminDashboard } from "../AdminDashboard";
import { MAINTENANCE_ROUTES, isMaintenanceRoute } from "../../maintenance";

/**
 * The sidebar and the view switch had no coverage at all before the
 * maintenance gate landed, which is precisely the pair the gate has to keep
 * in agreement. These tests lock both ends of it.
 */

const push = vi.hoisted(() => vi.fn());
const pathnameRef = vi.hoisted(() => ({ current: "/admin" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => pathnameRef.current,
}));

vi.mock("@sentry/nextjs", () => ({ setUser: vi.fn() }));

// EVERY view is stubbed, not just the gated three: StatsOverview is the
// switch's default branch and would otherwise fire getStats() — which, with
// `onUnhandledRequest: "error"`, fails the run rather than merely being slow.
// vi.hoisted, because vi.mock factories are hoisted above module scope and
// would otherwise reference this before it exists.
const stub = vi.hoisted(() => (testId: string) => {
  const Stubbed = () => <div data-testid={testId} />;
  return Stubbed;
});
vi.mock("../StatsOverview", () => ({ StatsOverview: stub("stats-overview") }));
vi.mock("../UsersView", () => ({ UsersView: stub("users-view") }));
vi.mock("../StudentsView", () => ({ StudentsView: stub("students-view") }));
vi.mock("../ParentsView", () => ({ ParentsView: stub("parents-view") }));
vi.mock("../PartnersView", () => ({ PartnersView: stub("partners-view") }));
vi.mock("../TeachersView", () => ({ TeachersView: stub("teachers-view") }));
vi.mock("../EnrollmentsView", () => ({ EnrollmentsView: stub("enrollments-view") }));
vi.mock("../AssignmentsView", () => ({ AssignmentsView: stub("assignments-view") }));
vi.mock("../IngestionsView", () => ({ IngestionsView: stub("ingestions-view") }));
vi.mock("../DevicesView", () => ({ DevicesView: stub("devices-view") }));
vi.mock("../DeviceDetailView", () => ({ DeviceDetailView: stub("device-detail-view") }));
vi.mock("../AgentsView", () => ({ AgentsView: stub("agents-view") }));
vi.mock("../WakeWordModelsView", () => ({ WakeWordModelsView: stub("wakeword-view") }));
vi.mock("../analytics/LearningSignalView", () => ({
  LearningSignalView: stub("learning-signal-view"),
}));

function renderAt(pathname: string) {
  pathnameRef.current = pathname;
  return render(<AdminDashboard />);
}

beforeEach(() => {
  push.mockClear();
  pathnameRef.current = "/admin";
});

describe("sidebar", () => {
  // Live screens are real links, so cmd-click and middle-click open them in a
  // new tab; the router handles the plain click.
  it("links to a screen that is not gated", () => {
    renderAt("/admin");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/admin/users");
  });

  it("marks the current screen", () => {
    renderAt("/admin/users");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("labels the gated screens as paused in the nav", () => {
    renderAt("/admin");
    expect(screen.getAllByText("Paused")).toHaveLength(3);
  });

  it.each([
    ["Devices", "/admin/devices"],
    ["Agents", "/admin/agents"],
    ["Wake-word Models", "/admin/wakeword-models"],
  ])("opens the notice instead of navigating for %s", (label) => {
    renderAt("/admin");
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(/maintenance/i);
  });

  it("names the screen that was clicked", () => {
    renderAt("/admin");
    fireEvent.click(screen.getByRole("button", { name: "Wake-word Models" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Wake-word Models");
  });

  // The notice is tied to the screen it was opened from, so navigating away
  // (a browser Back, say) closes it rather than leaving it floating over a
  // screen the admin never clicked it on.
  it("closes the notice when the screen changes underneath it", async () => {
    const { rerender } = renderAt("/admin");
    fireEvent.click(screen.getByRole("button", { name: "Devices" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    pathnameRef.current = "/admin/users";
    rerender(<AdminDashboard />);

    await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
    // The page cross-fades, so the new view mounts once the old one has left.
    expect(await screen.findByTestId("users-view")).toBeInTheDocument();
  });

  it("marks a gated entry aria-disabled but still clickable", () => {
    renderAt("/admin");
    const devices = screen.getByRole("button", { name: "Devices" });
    expect(devices).toHaveAttribute("aria-disabled", "true");
    // Not the `disabled` attribute — that would swallow the click, and the
    // click is the whole point.
    expect(devices).not.toBeDisabled();
  });

  // Awaited, not synchronous: Modal exits through AnimatePresence, so it is
  // still mounted on the tick after the click.
  it("dismisses the notice", async () => {
    renderAt("/admin");
    fireEvent.click(screen.getByRole("button", { name: "Agents" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
  });
});

describe("view switch", () => {
  it.each(MAINTENANCE_ROUTES)("shows the panel on a direct visit to %s", (route) => {
    renderAt(route);
    expect(screen.getByText(/under maintenance/i)).toBeInTheDocument();
  });

  it.each([
    ["/admin/devices", "devices-view"],
    ["/admin/agents", "agents-view"],
    ["/admin/wakeword-models", "wakeword-view"],
  ])("does not mount the real view at %s", (route, testId) => {
    renderAt(route);
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
  });

  /**
   * The gate sits ABOVE the `/admin/devices/` prefix match. Below it, this
   * path would mount DeviceDetailView and fire its device calls.
   */
  it("gates the nested device detail route too", () => {
    renderAt("/admin/devices/DEV-1234-5678");
    expect(screen.queryByTestId("device-detail-view")).not.toBeInTheDocument();
    expect(screen.getByText(/under maintenance/i)).toBeInTheDocument();
  });

  it("offers a way out of a direct visit", () => {
    renderAt("/admin/devices");
    fireEvent.click(screen.getByRole("button", { name: /back to overview/i }));
    expect(push).toHaveBeenCalledWith("/admin");
  });

  it.each([
    ["/admin", "stats-overview"],
    ["/admin/users", "users-view"],
    ["/admin/partners", "partners-view"],
    ["/admin/ingestions", "ingestions-view"],
  ])("still mounts %s", (route, testId) => {
    renderAt(route);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.queryByText(/under maintenance/i)).not.toBeInTheDocument();
  });

  it("falls through to the overview on an unknown admin path", () => {
    renderAt("/admin/nonsense");
    expect(screen.getByTestId("stats-overview")).toBeInTheDocument();
  });
});

/**
 * The assertion that keeps the two consumers from drifting: whatever the
 * sidebar gates must be exactly what the view switch gates.
 */
describe("the sidebar and the view switch agree", () => {
  it("gates the same set of routes", () => {
    renderAt("/admin");
    const gatedLabels = ["Devices", "Agents", "Wake-word Models"];

    for (const label of gatedLabels) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
    expect(MAINTENANCE_ROUTES.filter(isMaintenanceRoute)).toHaveLength(
      gatedLabels.length,
    );
  });
});
