import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { HomePage } from "../HomePage";
import { HowZooviWorksPage } from "../HowZooviWorksPage";
import { home } from "../content/home";
import { howItWorks } from "../content/howItWorks";

describe("Zoovi homepage", () => {
  it("shows every section's heading from the content doc", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Meet Zoovi.*Companion for curious minds/i);
    for (const title of [home.ways.items[0].name, home.ways.items[1].name, home.does.title, home.approach.title, home.faqs.title, home.closing.title]) {
      expect(screen.getAllByRole("heading", { name: title }).length).toBeGreaterThan(0);
    }
    for (const it of home.educators.items) expect(screen.getByRole("heading", { name: it.title })).toBeInTheDocument();
  });

  it("links CTAs that have a page, and leaves the rest as buttons", () => {
    render(<HomePage />);
    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("link", { name: /See How Zoovi Works/ })[0]).toHaveAttribute("href", "/how-zoovi-works");
    expect(within(main).getAllByRole("button", { name: "Get an Invite" }).length).toBeGreaterThan(0);
    expect(within(main).getByRole("button", { name: "Talk to Us" })).toBeInTheDocument();
    expect(within(main).queryByRole("link", { name: "Get an Invite" })).toBeNull();
  });

  it("opens one FAQ at a time", () => {
    render(<HomePage />);
    const first = screen.getByRole("button", { name: new RegExp(home.faqs.items[0].q.replace("?", "\\?")) });
    const second = screen.getByRole("button", { name: new RegExp(home.faqs.items[1].q.replace("?", "\\?")) });
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(home.faqs.items[1].a)).toBeVisible();
  });

  it("uses the Zoovi logo, not GenEd's", () => {
    render(<HomePage />);
    expect(screen.getAllByAltText("Zoovi").length).toBeGreaterThan(0);
    expect(screen.queryByAltText("GenEd")).toBeNull();
  });
});

describe("How Zoovi Works page", () => {
  it("walks through the four steps and all eight FAQs", () => {
    render(<HowZooviWorksPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(howItWorks.hero.title);
    for (const s of howItWorks.demo.steps) expect(screen.getByRole("heading", { name: s.title })).toBeInTheDocument();
    for (const f of howItWorks.faqs.items) expect(screen.getByRole("button", { name: new RegExp(f.q.replace(/[?]/g, "\\?")) })).toBeInTheDocument();
  });

  it("sends 'See How Zoovi Works' to the demo and parents to the homepage section", () => {
    render(<HowZooviWorksPage />);
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: /See How Zoovi Works/ })).toHaveAttribute("href", "#demo");
    expect(within(main).getByRole("link", { name: /Explore Zoovi for Parents/ })).toHaveAttribute("href", "/#parents");
  });
});
