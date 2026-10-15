import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { guardianStatus } from "@/test/msw/handlers/parent";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import { autoResetStore } from "@/test/helpers/resetStores";
import { useStudentStore } from "../../store/useStudentStore";
import { usePlacementStore } from "@/features/placement/store/usePlacementStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { GuardianCard } from "../profile/GuardianCard";
import { GuardianInvitePopup, PARENT_SIGN_UP } from "../guardian/GuardianInvitePopup";
import { createNextNavigationMock } from "@/test/helpers/nextNavigation";

const nav = vi.hoisted(() => ({ current: null as ReturnType<typeof createNextNavigationMock> | null }));
vi.mock("next/navigation", async () => {
  const { createNextNavigationMock: make } = await import("@/test/helpers/nextNavigation");
  nav.current = make();
  return nav.current;
});

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

autoResetStore(useStudentStore);
autoResetStore(usePlacementStore);

function status(overrides: Record<string, unknown>) {
  server.use(http.get(`${BASE}/parent/guardian/status`, () => HttpResponse.json(guardianStatus(overrides))));
}

const NO_ACCOUNT = {
  state: "awaiting_parent_registration",
  parent_account_registered: false,
  parent_onboarding_completed: false,
  guardian_consent_recorded: false,
  relationship_status: null,
  relationship_with_invited_parent: null,
  can_resend_invitation: true,
};

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("student", { profile: { user_id: "s1" } });
  useStudentStore.getState().setStudentProfile({ user_id: "s1", username: "ada", email: "", role: "STUDENT", name: "Ada" });
  usePlacementStore.setState({ phase: "unavailable" });
  useTutorialStore.setState({ isActive: false });
});

describe("GuardianCard — reads the real connection", () => {
  it("an approved, confirmed guardian shows as connected", async () => {
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText(/waiting/i)).not.toBeInTheDocument();
    // Parents have no name field: the card names the connected account by its email.
    expect(screen.getByTestId("guardian-connected-to")).toHaveTextContent("Connected to Mum@Example.com");
  });

  it("names no parent until the parent has confirmed", async () => {
    status({ state: "awaiting_parent_confirmation", relationship_status: "PENDING", linked_parent_email: null });
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Waiting for your parent to confirm")).toBeInTheDocument();
    expect(screen.queryByTestId("guardian-connected-to")).not.toBeInTheDocument();
  });

  it("a pending link is never shown as connected", async () => {
    status({
      state: "awaiting_parent_confirmation",
      relationship_status: "PENDING",
      guardian_consent_recorded: false,
      parent_onboarding_completed: false,
    });
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Waiting for your parent to confirm")).toBeInTheDocument();
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    expect(screen.getByText(/as soon as they confirm/i)).toBeInTheDocument();
  });

  it("with no parent account yet, says the invitation is out and can resend it", async () => {
    status(NO_ACCOUNT);
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Invitation sent")).toBeInTheDocument();
    expect(screen.getByText(/You can keep learning in the meantime/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));
    expect(await screen.findByText("Invitation sent again.")).toBeInTheDocument();
  });

  it("an unverified parent email can be verified with the parent's code", async () => {
    status({ ...NO_ACCOUNT, state: "email_unverified", parent_email_verified: false, can_resend_invitation: false });
    let verifiedWith: unknown = null;
    server.use(
      http.post(`${BASE}/parent/guardian/verify-email`, async ({ request }) => {
        verifiedWith = await request.json();
        return HttpResponse.json(guardianStatus(NO_ACCOUNT));
      }),
    );
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Parent email not verified")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send code to my parent" }));
    fireEvent.change(await screen.findByLabelText("Code from your parent"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("Invitation sent")).toBeInTheDocument();
    expect(verifiedWith).toEqual({ student_id: "s1", code: "123456" });
  });
});

describe("linking by email or phone", () => {
  it("a request the parent still has to confirm is not called linked", async () => {
    await useStudentStore.getState().linkParent("mum@example.com");
    const { partnerRequestStatus, partnerRequestMessage } = useStudentStore.getState();
    expect(partnerRequestStatus).toBe("success");
    expect(partnerRequestMessage).not.toMatch(/successfully linked/i);
    expect(partnerRequestMessage).toMatch(/needs to confirm/i);
  });
});

describe("GuardianInvitePopup — after onboarding", () => {
  it("tells a student whose verified parent email has no account yet how they connect", async () => {
    status(NO_ACCOUNT);
    render(<GuardianInvitePopup />);
    const dialog = await screen.findByRole("dialog", { name: "Invite your parent to GenEd" });
    expect(dialog).toHaveTextContent("there's no GenEd parent account with that email yet");
    expect(dialog).toHaveTextContent("You can keep using GenEd right now");
    expect(dialog).toHaveTextContent("Your parent needs to create their own parent account using mum@example.com");
    expect(dialog).toHaveTextContent("your accounts connect automatically");
    // No raw URL in the popup: a button opens the parent sign-up form.
    expect(dialog).not.toHaveTextContent("/register");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create parent account" }));
    expect(nav.current!.router.push).toHaveBeenCalledWith(PARENT_SIGN_UP);
    expect(PARENT_SIGN_UP).toBe("/register?role=parent&redirect=%2Fparent");

    fireEvent.click(within(dialog).getByRole("button", { name: "Send the invitation again" }));
    expect(await within(dialog).findByText("Invitation sent again.")).toBeInTheDocument();
  });

  it("is dismissible, and stays put away", async () => {
    status(NO_ACCOUNT);
    const { unmount } = render(<GuardianInvitePopup />);
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Maybe later" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    unmount();
    render(<GuardianInvitePopup />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never shows once the parent has connected, or is confirming", async () => {
    const { unmount } = render(<GuardianInvitePopup />); // default: linked
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();
    status({ state: "awaiting_parent_confirmation", relationship_status: "PENDING" });
    render(<GuardianInvitePopup />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("waits until onboarding is over (placement still open)", async () => {
    status(NO_ACCOUNT);
    usePlacementStore.setState({ phase: "intro" });
    render(<GuardianInvitePopup />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
