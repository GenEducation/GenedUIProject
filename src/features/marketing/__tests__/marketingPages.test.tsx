import { describe, it, expect, afterEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import { HomePage } from "../HomePage";
import { ParentsPage } from "../ParentsPage";
import { EducatorsPage } from "../EducatorsPage";
import { AboutPage } from "../AboutPage";
import { EDUCATOR_INVITE_HREF, INVITE_HREF, ROUTES, SKIP_INTRO_KEY } from "../routes";

const MAILTO = "mailto:info@gened.ai";

afterEach(() => window.history.pushState({}, "", "/"));

const nav = () => screen.getByRole("banner");

describe("Zoovi marketing nav", () => {
  it.each([
    ["home", HomePage, "Home", INVITE_HREF],
    ["parents", ParentsPage, "For Parents", INVITE_HREF],
    ["educators", EducatorsPage, "For Educators", EDUCATOR_INVITE_HREF],
    ["about", AboutPage, "About", INVITE_HREF],
  ] as const)("on the %s page links home, both audiences, about, log in and invite", (_, Page, current, invite) => {
    render(<Page />);
    const header = nav();
    expect(within(header).getByRole("link", { name: "Zoovi home" })).toHaveAttribute("href", "/");
    expect(within(header).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    const parents = within(header).getByRole("link", { name: /Parents/ });
    const educators = within(header).getByRole("link", { name: /Educators/ });
    expect(parents).toHaveAttribute("href", ROUTES.parents);
    expect(educators).toHaveAttribute("href", ROUTES.educators);
    expect(within(header).getByRole("link", { name: "About" })).toHaveAttribute("href", ROUTES.about);
    expect(within(header).getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(within(header).getByRole("link", { name: "Get an Invite" })).toHaveAttribute("href", invite);
    // the current page is marked
    const marked = within(header)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page")
      .map((a) => a.getAttribute("aria-label") ?? a.textContent);
    expect(marked).toEqual([current]);
  });

  it("leaves the home page a one-time flag to skip its loader from the Home link, not from the logo", () => {
    render(<ParentsPage />);
    sessionStorage.clear();
    const header = nav();
    within(header).getByRole("link", { name: "Zoovi home" }).addEventListener("click", (e) => e.preventDefault());
    within(header).getByRole("link", { name: "Home" }).addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(within(header).getByRole("link", { name: "Zoovi home" }));
    expect(sessionStorage.getItem(SKIP_INTRO_KEY)).toBeNull();
    fireEvent.click(within(header).getByRole("link", { name: "Home" }));
    expect(sessionStorage.getItem(SKIP_INTRO_KEY)).toBe("1");
  });

  it("carries a safe ?redirect on to Log in", async () => {
    const to = "/parent?token=t1";
    window.history.pushState({}, "", `/?redirect=${encodeURIComponent(to)}`);
    render(<HomePage />);
    expect(await within(nav()).findByRole("link", { name: "Log in" })).toHaveAttribute("href", `/login?redirect=${encodeURIComponent(to)}`);
  });

  it("sends every Get an Invite on the Parents page to the invite form, and Talk to Us to email", () => {
    render(<ParentsPage />);
    const main = screen.getByRole("main");
    const invites = within(main).getAllByRole("link", { name: "Get an Invite" });
    expect(invites.length).toBeGreaterThan(0);
    for (const a of invites) expect(a).toHaveAttribute("href", INVITE_HREF);
    expect(within(main).getByRole("link", { name: "Talk to Us" })).toHaveAttribute("href", MAILTO);
  });
});

describe("Zoovi home (take B)", () => {
  it("tells the whole story in the server markup", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Companion for curious minds");
    for (const name of [
      "A new way to ask. A better way to learn.",
      "You see the marks. But do you see the learning?",
      "One learning companion. A seamless learning experience.",
      "Learning that builds understanding",
      "Give every student more opportunities to learn",
      "Give every question room to grow.",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    // the FAQs are left out of the home page
    expect(screen.queryByRole("heading", { name: "Frequently asked questions" })).toBeNull();
    expect(screen.getByText("Companion for curious minds")).toBeInTheDocument();
    for (const verb of ["Ask questions", "Understand concepts", "Revise and practise", "Discover more"]) {
      expect(screen.getByRole("heading", { name: verb })).toBeInTheDocument();
    }
  });

  it("links the audience pages and email CTAs", () => {
    render(<HomePage />);
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: "Explore Zoovi for Parents" })).toHaveAttribute("href", ROUTES.parents);
    expect(within(main).getByRole("link", { name: "Explore Zoovi for Educators" })).toHaveAttribute("href", ROUTES.educators);
    expect(within(main).getByRole("link", { name: "Talk to Us" })).toHaveAttribute("href", MAILTO);
    for (const a of within(main).getAllByRole("link", { name: "Get an Invite" })) expect(a).toHaveAttribute("href", INVITE_HREF);
    // targets that don't exist yet stay inert and are marked for follow-up
    for (const a of within(main).getAllByRole("link", { name: "See How Zoovi Works" })) {
      expect(a).toHaveAttribute("href", "#");
      expect(a).toHaveAttribute("data-todo");
    }
  });

  it("asks only for the renders the chosen designs use", () => {
    const { container } = render(<HomePage />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs.every((s) => s?.startsWith("/zoovi/"))).toBe(true);
  });
});

describe("Zoovi for Parents (take A)", () => {
  it("shows the hero, the six concerns, the reveal and the dashboard tail", () => {
    const { container } = render(<ParentsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Know more about your child’s learning. Every day.");
    expect(container.querySelectorAll(".orbit li")).toHaveLength(6);
    expect(screen.getByRole("heading", { name: "A grade, a remark, and a long wait" })).toBeInTheDocument();
    // the reveal's title, and again (for screen readers) over the dashboard features
    expect(screen.getAllByRole("heading", { name: "Daily insights into your child’s learning" })).toHaveLength(2);
    for (const f of ["Daily learning updates", "Shareable reports"]) expect(screen.getByRole("heading", { name: f })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Be closer to every step of your child’s learning journey" })).toBeInTheDocument();
    // take A leaves the FAQs out
    expect(screen.queryByRole("heading", { name: "Frequently asked questions" })).toBeNull();
    expect(container.querySelector('img[src="/zoovi/parents/office.webp"]')).not.toBeNull();
  });
});

describe("Zoovi for Educators (take A)", () => {
  it("shows the hero, the philosophy folder, Zoovi at work and the school steps", () => {
    const { container } = render(<EducatorsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("More support for students. More insight for educators.");
    for (const p of ["Curiosity matters", "Understanding takes time", "Every child has a different learning journey"]) {
      expect(screen.getByRole("heading", { name: new RegExp(p) })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Your teaching assistant. Your extra pair of hands." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bring Zoovi into your school" })).toBeInTheDocument();
    for (const a of screen.getAllByRole("link", { name: "Register for the Educator Programme" })) {
      expect(a).toHaveAttribute("href", EDUCATOR_INVITE_HREF);
    }
    expect(container.querySelector("#lab-seq")).not.toBeNull();
  });
});

describe("About", () => {
  it("tells GenEd's story, leaving out what the other pages already say", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Beyond answers. Towards real understanding.");
    for (const name of [
      "Children are naturally curious. Learning should encourage that.",
      "Learning doesn’t follow the same path for every child.",
      "A future where curiosity has room to grow",
      "Meet the team",
      "Making personalised learning accessible to every child",
      "Meet a new kind of learning companion",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    for (const p of ["Different starting points", "Time to revisit", "Practice to progress"]) {
      expect(screen.getByRole("heading", { name: p })).toBeInTheDocument();
    }
    for (const v of ["Empathy", "Curiosity", "Understanding", "Accessibility", "Responsibility"]) {
      expect(screen.getByRole("heading", { name: v })).toBeInTheDocument();
    }
    // home's six pillars are not repeated here
    expect(screen.queryByRole("heading", { name: "Child-first learning" })).toBeNull();
  });

  it("introduces both founders with their LinkedIn profiles, opening in a new tab", () => {
    render(<AboutPage />);
    for (const [name, href] of [
      ["Vedant", "https://www.linkedin.com/in/vedant-bisen-147a591b9"],
      ["Utkarsh", "https://www.linkedin.com/in/utkarsh9abxt"],
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      const a = screen.getByRole("link", { name: `${name} on LinkedIn` });
      expect(a).toHaveAttribute("href", href);
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByRole("img", { name: /Vedant, Founder and CEO/ })).toHaveAttribute("src", "/zoovi/about/vedant.webp");
  });

  it("links its calls to action and is reachable from the footer", () => {
    render(<AboutPage />);
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: "Get in Touch" })).toHaveAttribute("href", MAILTO);
    expect(within(main).getByRole("link", { name: "Explore Zoovi" })).toHaveAttribute("href", ROUTES.home);
    expect(within(main).getByRole("link", { name: "Meet the team" })).toHaveAttribute("href", "#team");
    expect(within(screen.getByRole("navigation", { name: "Company" })).getByRole("link", { name: "About" })).toHaveAttribute("href", ROUTES.about);
  });
});
