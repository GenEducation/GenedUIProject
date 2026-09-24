import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FigureBlock } from "../FigureBlock";
import type { FigureCrop, FigureGroup, PresentationManifest } from "../../types/lesson";

// jsdom doesn't implement the imperative <dialog> API (showModal/close) — every real
// browser this app targets does. Stub it so the enlarge dialog's open/close effect runs.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

function crop(overrides: Partial<FigureCrop> = {}): FigureCrop {
  return {
    id: "crop-1",
    sha256: "a".repeat(64),
    width_px: 400,
    height_px: 300,
    mime: "image/png",
    printed_text: "Fig. 7.1",
    learner_alt_text: "A rectangle split into four equal parts, one shaded",
    tutor_description: "A rectangle divided into four equal vertical strips, with the second strip shaded.",
    ...overrides,
  };
}

function group(overrides: Partial<FigureGroup> = {}): FigureGroup {
  return { id: "group-1", reading_order: 1, after_chunk_id: null, figures: [crop()], ...overrides };
}

function manifestFor(...crops: FigureCrop[]): PresentationManifest {
  return {
    expires_at: 9999999999,
    figures: Object.fromEntries(
      crops.map((c) => [
        c.id,
        { figure_group_id: "group-1", url: `https://api.test/v1/assets/${c.id}?exp=1&sig=x`, width_px: c.width_px, height_px: c.height_px, mime: c.mime, sha256: c.sha256 },
      ]),
    ),
  };
}

describe("FigureBlock", () => {
  it("renders a single crop with its learner alt text and signed URL", () => {
    const c = crop();
    render(<FigureBlock group={group({ figures: [c] })} manifest={manifestFor(c)} onExpired={vi.fn()} />);
    const img = screen.getByAltText(c.learner_alt_text) as HTMLImageElement;
    expect(img.src).toContain(`/v1/assets/${c.id}`);
  });

  it("renders every crop of a multi-crop group, in the group's own order", () => {
    const a = crop({ id: "a", learner_alt_text: "First crop" });
    const b = crop({ id: "b", learner_alt_text: "Second crop" });
    render(<FigureBlock group={group({ figures: [a, b] })} manifest={manifestFor(a, b)} onExpired={vi.fn()} />);
    const images = screen.getAllByRole("button", { name: /Enlarge/ });
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAccessibleName(/First crop/);
    expect(images[1]).toHaveAccessibleName(/Second crop/);
  });

  it("falls back to the printed text when the manifest has no entry for a crop yet", () => {
    const c = crop();
    render(<FigureBlock group={group({ figures: [c] })} manifest={null} onExpired={vi.fn()} />);
    expect(screen.getByRole("img", { name: c.learner_alt_text })).toBeInTheDocument();
    expect(screen.getByText(c.printed_text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enlarge/ })).not.toBeInTheDocument();
  });

  it("calls onExpired when the image fails to load (a signature past its TTL window)", () => {
    const c = crop();
    const onExpired = vi.fn();
    render(<FigureBlock group={group({ figures: [c] })} manifest={manifestFor(c)} onExpired={onExpired} />);
    fireEvent.error(screen.getByAltText(c.learner_alt_text));
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("marks a group already presented in the conversation as 'discussed above' instead of hiding it", () => {
    const c = crop();
    render(<FigureBlock group={group({ figures: [c] })} manifest={manifestFor(c)} onExpired={vi.fn()} discussedElsewhere />);
    expect(screen.getByText("Discussed above")).toBeInTheDocument();
    expect(screen.getByAltText(c.learner_alt_text)).toBeInTheDocument();
  });

  it("opens an enlarged, labelled dialog on tap, and closes it", () => {
    const c = crop();
    render(<FigureBlock group={group({ figures: [c] })} manifest={manifestFor(c)} onExpired={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Enlarge/ }));
    const dialog = screen.getByRole("dialog", { name: c.learner_alt_text });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(c.tutor_description)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
