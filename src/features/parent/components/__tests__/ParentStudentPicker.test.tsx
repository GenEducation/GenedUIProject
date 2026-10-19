import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/msw/server";
import { seedAuthLocalStorage } from "@/test/helpers/auth";
import type { LinkedStudent } from "../../services/parentService";
import { ParentStudentPicker } from "../ParentStudentPicker";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";

const kid = (id: string, name?: string): LinkedStudent => ({
  student_id: id,
  parent_id: "p1",
  status: "APPROVED",
  requested_at: "now",
  name,
});

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("parent", { profile: { user_id: "p1" } });
  server.use(
    http.get(`${BASE}/students/:id/profile`, ({ params }) =>
      params.id === "forbidden"
        ? new HttpResponse(null, { status: 403 })
        : HttpResponse.json({ grade: params.id === "s1" ? 7 : 5 }),
    ),
  );
});

describe("ParentStudentPicker", () => {
  it("lists each child with the grade fetched from their profile", async () => {
    render(<ParentStudentPicker students={[kid("s1", "Aarav"), kid("s2", "Priya")]} onSelect={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /who are you checking on today/i })).toBeInTheDocument();
    expect(screen.getByText("Aarav")).toBeInTheDocument();
    expect(await screen.findByText("Grade 7")).toBeInTheDocument();
    expect(await screen.findByText("Grade 5")).toBeInTheDocument();
  });

  it("leaves the grade out when the profile can't be read, without logging out", async () => {
    render(<ParentStudentPicker students={[kid("forbidden", "Rohan"), kid("s2", "Priya")]} onSelect={vi.fn()} />);

    expect(await screen.findByText("Grade 5")).toBeInTheDocument();
    expect(screen.getAllByText(/^Grade \d+$/)).toHaveLength(1);
    expect(localStorage.getItem("gened_auth_token")).not.toBeNull();
  });

  it("hands the chosen child to onSelect", () => {
    const onSelect = vi.fn();
    render(<ParentStudentPicker students={[kid("s1", "Aarav"), kid("s2", "Priya")]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "View Priya's dashboard" }));
    expect(onSelect).toHaveBeenCalledWith("s2");
  });

  it("collapses more than four children behind an All Profiles tile", async () => {
    const kids = ["A", "B", "C", "D", "E", "F", "G"].map((n, i) => kid(`k${i}`, n));
    render(<ParentStudentPicker students={kids} onSelect={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /^View .*'s dashboard$/ })).toHaveLength(3);
    expect(screen.getByText("4 more students")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all 7 profiles" }));
    expect(screen.getAllByRole("button", { name: /^View .*'s dashboard$/ })).toHaveLength(7);
    expect(screen.queryByText("All Profiles")).not.toBeInTheDocument();
  });

  it("renders a loading shell without children", () => {
    render(<ParentStudentPicker loading />);
    expect(screen.getByRole("list", { name: "Your children" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button", { name: /dashboard/i })).not.toBeInTheDocument();
  });
});

describe("ParentStudentPicker — narrow screens", () => {
  const realMatchMedia = window.matchMedia;

  // Narrow viewport with a mouse/trackpad: one profile at a time plus arrows.
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      ...realMatchMedia(query),
      matches: query.includes("max-width") || query.includes("pointer: fine"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  const kids = [kid("s1", "Aarav"), kid("s2", "Priya"), kid("s3", "Rohan")];

  it("shows a single profile with previous/next controls", () => {
    render(<ParentStudentPicker students={kids} onSelect={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /^View .*'s dashboard$/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "View Aarav's dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous profile" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next profile" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Show Aarav" })).toHaveAttribute("aria-current", "true");
  });

  it("moves between profiles with the arrows, dots and arrow keys", async () => {
    const onSelect = vi.fn();
    render(<ParentStudentPicker students={kids} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Next profile" }));
    fireEvent.click(await screen.findByRole("button", { name: "View Priya's dashboard" }));
    expect(onSelect).toHaveBeenCalledWith("s2");

    fireEvent.click(screen.getByRole("button", { name: "Show Rohan" }));
    expect(await screen.findByRole("button", { name: "View Rohan's dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next profile" })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole("region", { name: "Your children" }), { key: "ArrowLeft" });
    expect(await screen.findByRole("button", { name: "View Priya's dashboard" })).toBeInTheDocument();
  });

  it("lists every child in the carousel, with no All Profiles tile", async () => {
    const many = ["A", "B", "C", "D", "E", "F"].map((n, i) => kid(`k${i}`, n));
    render(<ParentStudentPicker students={many} onSelect={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /^Show [A-F]$/ })).toHaveLength(6);
    expect(screen.queryByText("All Profiles")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/A, 1 of 6/)).toBeInTheDocument());
  });
});
