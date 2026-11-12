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

  it("falls back to 'Partner Portal' when there is no organization", async () => {
    localStorage.setItem("gened_user_profile", JSON.stringify({ role: "PARTNER" }));
    renderSideBar();

    expect(await screen.findByRole("heading", { name: "Partner Portal" })).toBeInTheDocument();
  });
});
