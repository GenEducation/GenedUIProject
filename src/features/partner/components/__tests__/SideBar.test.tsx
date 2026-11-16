import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/shared/GenEdLogo", () => ({ GenEdLogo: () => <div /> }));

import { SideBar } from "../SideBar";

afterEach(() => localStorage.clear());

const renderSideBar = () =>
  render(<SideBar activeView="subjects" onViewChange={vi.fn()} />);

describe("SideBar header", () => {
  it("names the partner's school from the saved sign-in profile", async () => {
    localStorage.setItem(
      "gened_user_profile",
      JSON.stringify({ role: "PARTNER", organization: "Delhi Public School" }),
    );
    renderSideBar();

    expect(
      await screen.findByRole("heading", { name: "Delhi Public School" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Partner Portal")).not.toBeInTheDocument();
  });

  it("adds 'School' when the name doesn't already include it", async () => {
    localStorage.setItem("gened_user_profile", JSON.stringify({ role: "PARTNER", organization: "GenEd" }));
    renderSideBar();

    expect(await screen.findByRole("heading", { name: "GenEd School" })).toBeInTheDocument();
  });

  it("falls back to 'Partner Portal' when there is no organization", async () => {
    localStorage.setItem("gened_user_profile", JSON.stringify({ role: "PARTNER" }));
    renderSideBar();

    expect(await screen.findByRole("heading", { name: "Partner Portal" })).toBeInTheDocument();
  });
});

describe("SideBar navigation", () => {
  it("hides Lab Mode while the feature is off", () => {
    renderSideBar();

    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Subjects")).toBeInTheDocument();
    expect(screen.queryByText("Lab Mode")).not.toBeInTheDocument();
  });
});
