import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { useStudentStore } from "@/features/student/store/useStudentStore";

import { GuardianCard } from "../GuardianCard";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const link = (status: string | null) =>
  server.use(
    http.get(`${BASE}/parent/link/status`, () =>
      HttpResponse.json(status ? { student_id: "u-synthetic", parent_id: "p-synthetic", status, requested_at: "2026-10-01T00:00:00Z" } : null),
    ),
  );

beforeEach(() => {
  localStorage.setItem("gened_auth_token", "token-synthetic");
  useStudentStore.setState({ studentProfile: { user_id: "u-synthetic", username: "synthetic", role: "STUDENT", grade: 6 } });
});

describe("Guardian connection", () => {
  it("says connected once a guardian approved the link, with nothing left to invite", async () => {
    link("APPROVED");
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Invite/ })).toBeNull();
  });

  it("waits while the guardian hasn't answered", async () => {
    link("PENDING");
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Waiting for approval")).toBeInTheDocument();
  });

  it("offers an invite when there is no link", async () => {
    link(null);
    render(<GuardianCard index={0} />);
    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite \/ Link guardian/ })).toBeInTheDocument();
  });
});
