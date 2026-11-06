import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import type { LinkedStudent } from "../../../services/parentService";

import { ChildBotsSection } from "../ChildBotsSection";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";
const BOT = {
  id: "b-9",
  label: "GenEd bot ·1A2B",
  paired_at: "2026-11-01T10:00:00Z",
  last_used_at: "2026-11-05T09:00:00Z",
  disconnects_at: "2026-12-05T09:00:00Z",
};
const child = (id: string, name: string) =>
  ({ student_id: id, parent_id: "p1", status: "APPROVED", requested_at: "now", name }) as LinkedStudent;

beforeEach(() => {
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

describe("A parent's view of their children's bots", () => {
  it("lists each child's bots and lets the parent remove one", async () => {
    let deleted = "";
    server.use(
      http.get(`${BASE}/v1/devices/children/:id/bots`, ({ params }) =>
        HttpResponse.json(params.id === "s2" ? [BOT] : []),
      ),
      http.delete(`${BASE}/v1/devices/children/:id/bots/:botId`, ({ params }) => {
        deleted = `${params.id}/${params.botId}`;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<ChildBotsSection students={[child("s2", "Bob"), child("s3", "Cara")]} />);
    expect(await screen.findByText("GenEd bot ·1A2B")).toBeInTheDocument();
    expect(screen.getByText("No bot paired.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove GenEd bot ·1A2B" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.getAllByText("No bot paired.")).toHaveLength(2));
    expect(deleted).toBe("s2/b-9");
  });

  it("leaves out a child whose bots it may not read, without signing the parent out", async () => {
    server.use(
      http.get(`${BASE}/v1/devices/children/:id/bots`, ({ params }) =>
        params.id === "s2" ? HttpResponse.json({ detail: "no approved link" }, { status: 403 }) : HttpResponse.json([BOT]),
      ),
    );
    render(<ChildBotsSection students={[child("s2", "Bob"), child("s3", "Cara")]} />);
    expect(await screen.findByText("GenEd bot ·1A2B")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(localStorage.getItem("gened_auth_token")).toBe("token-synthetic");
  });
});
