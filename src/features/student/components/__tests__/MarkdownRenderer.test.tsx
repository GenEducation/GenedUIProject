import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { MarkdownRenderer } from "../MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders a GitHub-flavored markdown table", () => {
    const { container } = render(
      <MarkdownRenderer content={"| A | B |\n| --- | --- |\n| 1 | 2 |"} />,
    );
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders inline math as KaTeX output", () => {
    const { container } = render(<MarkdownRenderer content="The area is $x^2$." />);
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });

  it("renders block math as KaTeX output", () => {
    const { container } = render(<MarkdownRenderer content={"$$\\int_0^1 x\\,dx$$"} />);
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });

  it("applies highlight.js classes to fenced code blocks", () => {
    const { container } = render(
      <MarkdownRenderer content={"```js\nconst x = 1;\n```"} />,
    );
    expect(container.querySelector("code.language-js")).toBeInTheDocument();
    expect(container.querySelector("pre")).toBeInTheDocument();
  });

  it("does not render raw HTML tags — no rehype-raw plugin is wired in", () => {
    const { container } = render(
      <MarkdownRenderer content={'<img src=x onerror="window.__pwned=true">'} />,
    );
    // react-markdown escapes/ignores raw HTML by default without rehype-raw; the tag
    // must not become a live DOM element capable of firing onerror.
    expect(container.querySelector("img[onerror]")).not.toBeInTheDocument();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("strips SHOW_FIGURE-free audio skill directives before rendering", () => {
    render(<MarkdownRenderer content={'Hello <<SPEAK_PARA:{"text":"hi"}>> world'} />);
    expect(screen.queryByText(/SPEAK_PARA/)).not.toBeInTheDocument();
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText(/world/)).toBeInTheDocument();
  });
});
