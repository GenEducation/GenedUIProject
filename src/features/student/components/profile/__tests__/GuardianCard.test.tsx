import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { guardianStatus } from "@/test/msw/handlers/parent";
import { useStudentStore } from "@/features/student/store/useStudentStore";

import { GuardianCard } from "../GuardianCard";

// The card reads the student's guardian status (`GET /parent/guardian/status`), which carries the link's status and
// everything around it (verification, invitation, the connected parent); these are the link states it shows.
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const guardian = (overrides: Record<string, unknown>) =>
  server.use(
    http.get(`${BASE}/parent/guardian/status`, () =>
      HttpResponse.json(guardianStatus({ student_id: "u-synthetic", ...overrides })),
    ),
  );

beforeEach(() => {
  localStorage.setItem("gened_auth_token", "token-synthetic");
  useStudentStore.setState({ studentProfile: { user_id: "u-synthetic", username: "synthetic", role: "STUDENT", grade: 6 } });
});

describe("Guardian connection", () => {
  it("says connected once a guardian approved the link, with nothing left to invite", async () => {
    guardian({ state: "linked", relationship_status: "APPROVED" });
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Invite/ })).toBeNull();
  });

  it("waits while the guardian hasn't answered", async () => {
    guardian({ state: "awaiting_parent_confirmation", relationship_status: "PENDING", linked_parent_email: null, linked_parent_name: null });
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Waiting for your parent to confirm")).toBeInTheDocument();
  });

  it("offers an invite when there is no link", async () => {
    guardian({
      state: "no_parent_email",
      parent_email: null,
      parent_email_supplied: false,
      parent_email_verified: false,
      parent_account_registered: false,
      relationship_status: null,
      relationship_with_invited_parent: null,
      linked_parent_email: null,
      linked_parent_name: null,
    });
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite guardian/ })).toBeInTheDocument();
  });
});
