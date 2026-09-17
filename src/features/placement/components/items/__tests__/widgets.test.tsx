import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ItemRenderer } from "../ItemRenderer";
import { PLACEMENT_ITEMS } from "@/test/msw/handlers/placement";
import type { PlacementItem, PlacementResponse } from "../../../types/placement";

/**
 * These assert the exact payload each widget emits, because the payload is the
 * contract — and every one of these shapes has a way to be subtly wrong that
 * still looks right on screen: sending display text instead of ids, sending an
 * order-independent answer as a set when it should be a sequence, or sending
 * screen pixels where the backend expects image-space ones. A widget that
 * renders beautifully and emits the wrong shape is graded as a wrong answer by
 * a child who got it right.
 */

const item = (id: string) => PLACEMENT_ITEMS.find((i) => i.item_id === id)!;

/**
 * Renders a widget the way the app does: the draft goes back in as `value`.
 *
 * The text widgets are controlled, so a harness that spies on onChange without
 * feeding the draft back loses every keystroke but the last — typing "405"
 * would assert `{ value: 5 }`. The spy wraps the real state update rather than
 * replacing it.
 */
function renderItem(placementItem: PlacementItem, initial: PlacementResponse | null = null) {
  const onChange = vi.fn();

  function Harness() {
    const [value, setValue] = useState<PlacementResponse | null>(initial);
    return (
      <ItemRenderer
        item={placementItem}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }

  const view = render(<Harness />);
  return { onChange, view };
}

describe("placement item widgets", () => {
  describe("mcq", () => {
    it("sends the option id, never its display text", async () => {
      const { onChange } = renderItem(item("CBSE-G6-ENG-01"));
      await userEvent.click(screen.getByText("Angry"));
      expect(onChange).toHaveBeenCalledWith({ choice: "b" });
    });
  });

  describe("true_false", () => {
    it("renders block_spec.statement and sends a string choice", async () => {
      const { onChange } = renderItem(item("CBSE-G6-SCI-01"));
      expect(screen.getByText(/Ice is less dense/)).toBeInTheDocument();
      await userEvent.click(screen.getByText("True"));
      expect(onChange).toHaveBeenCalledWith({ choice: "true" });
    });
  });

  describe("multi_select", () => {
    it("accumulates ids, and clears to null when the last one is unpicked", async () => {
      const { onChange } = renderItem(item("CBSE-G6-GEO-01"));
      await userEvent.click(screen.getByText("Plateau"));
      expect(onChange).toHaveBeenLastCalledWith({ selected: ["a"] });

      await userEvent.click(screen.getByText("Valley"));
      // Bank order, not click order — grading is order-independent either way,
      // but a stable payload is easier to read in item statistics.
      expect(onChange).toHaveBeenLastCalledWith({ selected: ["a", "c"] });
    });

    it("emits null rather than an empty answer", async () => {
      const multi = item("CBSE-G6-GEO-01");
      const { onChange } = renderItem(multi, { selected: ["a"] });
      await userEvent.click(screen.getByText("Plateau"));
      expect(onChange).toHaveBeenLastCalledWith(null);
    });
  });

  describe("numeric", () => {
    it("sends a bare number, with the unit kept out of the payload", async () => {
      const { onChange } = renderItem(item("CBSE-G6-MATH-01"));
      await userEvent.type(screen.getByRole("textbox"), "405");
      expect(onChange).toHaveBeenLastCalledWith({ value: 405 });
    });

    it("shows block_spec.unit as a label", () => {
      renderItem(item("CBSE-G6-MATH-01"));
      expect(screen.getByText("₹")).toBeInTheDocument();
    });

    it("sends the text form for a fraction item", async () => {
      const fraction: PlacementItem = {
        ...item("CBSE-G6-MATH-01"),
        block_spec: { input: "fraction" },
      };
      const { onChange } = renderItem(fraction);
      await userEvent.type(screen.getByRole("textbox"), "3/4");
      expect(onChange).toHaveBeenLastCalledWith({ text: "3/4" });
    });
  });

  describe("fill_blank", () => {
    it("sends what the student typed, uncorrected", async () => {
      const { onChange } = renderItem(item("CBSE-G6-ENG-03"));
      await userEvent.type(screen.getByRole("textbox"), "But");
      // Not lowercased: the backend ignores case, and item statistics want the
      // real wording.
      expect(onChange).toHaveBeenLastCalledWith({ text: "But" });
    });
  });

  describe("order", () => {
    it("seeds the served order so the item is answerable without a drag", () => {
      const { onChange } = renderItem(item("CBSE-G6-ENG-02"));
      expect(onChange).toHaveBeenCalledWith({ order: ["f1", "f2", "f3"] });
    });

    it("emits an exact sequence of ids when a row moves", async () => {
      const { onChange } = renderItem(item("CBSE-G6-ENG-02"));
      onChange.mockClear();
      await userEvent.click(screen.getByLabelText('Move "1/8" up'));
      expect(onChange).toHaveBeenLastCalledWith({ order: ["f2", "f1", "f3"] });
    });
  });

  describe("match", () => {
    it("pairs left to right by id, in left-column order", async () => {
      const matchItem = item("CBSE-G6-GEO-07");
      const { onChange } = renderItem(matchItem);
      await userEvent.click(screen.getByText("Ganga"));
      await userEvent.click(screen.getByText("Bay of Bengal"));
      expect(onChange).toHaveBeenLastCalledWith({ pairs: [["l1", "r2"]] });
    });

    it("releases a right item when another left item claims it", async () => {
      const matchItem = item("CBSE-G6-GEO-07");
      const { onChange } = renderItem(matchItem, { pairs: [["l1", "r2"]] });
      await userEvent.click(screen.getByText("Narmada"));
      await userEvent.click(screen.getByText("Bay of Bengal"));
      expect(onChange).toHaveBeenLastCalledWith({ pairs: [["l2", "r2"]] });
    });
  });

  describe("map_point", () => {
    /**
     * The trap this guards: block_spec.width × height is the image's own pixel
     * space, not the screen's — 21000 × 29700 for the two served maps. A
     * 500px-wide render of a 21000-wide map must scale the click back before
     * sending, or the same correct click grades differently on a phone and a
     * laptop.
     */
    it("scales a click back into block_spec pixel space", async () => {
      const { toImageSpace } = await import("../MapPointItem");
      const spec = { width: 21000, height: 29700 };
      // A frame rendered at a fraction of native size, offset on the page.
      const rect = { left: 20, top: 40, width: 420, height: 594 };

      expect(toImageSpace(20, 40, rect, spec)).toEqual({ x: 0, y: 0 });
      expect(toImageSpace(440, 634, rect, spec)).toEqual({ x: 21000, y: 29700 });
      // A click at the frame's centre is the image's centre, not the screen's.
      expect(toImageSpace(230, 337, rect, spec)).toEqual({ x: 10500, y: 14850 });
    });

    it("renders the served map and sends coordinates in its native pixel space", async () => {
      const mapItem = item("CBSE-G7-GEO-02");
      const onChange = vi.fn();
      const { container } = render(<ItemRenderer item={mapItem} value={null} onChange={onChange} />);

      const frame = container.querySelector('[class*="cursor-crosshair"]') as HTMLElement;
      expect(frame).toBeInTheDocument();

      Object.defineProperty(frame, "getBoundingClientRect", {
        value: () => ({ left: 0, top: 0, width: 420, height: 594, right: 420, bottom: 594, x: 0, y: 0, toJSON() {} }),
      });
      fireEvent.click(frame, { clientX: 210, clientY: 297 });

      expect(onChange).toHaveBeenCalledWith({ point: { x: 10500, y: 14850 } });
      expect(screen.getByText(/d-maps\.com/)).toBeInTheDocument();
    });

    it("renders the other served map (india-states-outline) too — both are live, not just the rivers one", async () => {
      const mapItem = item("CBSE-G6-GEO-06");
      const onChange = vi.fn();
      const { container } = render(<ItemRenderer item={mapItem} value={null} onChange={onChange} />);

      const frame = container.querySelector('[class*="cursor-crosshair"]') as HTMLElement;
      expect(frame).toBeInTheDocument();

      Object.defineProperty(frame, "getBoundingClientRect", {
        value: () => ({ left: 0, top: 0, width: 420, height: 594, right: 420, bottom: 594, x: 0, y: 0, toJSON() {} }),
      });
      fireEvent.click(frame, { clientX: 210, clientY: 297 });

      expect(onChange).toHaveBeenCalledWith({ point: { x: 10500, y: 14850 } });
    });

    it("stays passable, and says so, when the asset name isn't vendored", async () => {
      const { MapPointItem } = await import("../MapPointItem");
      const mapItem: PlacementItem = {
        ...item("CBSE-G7-GEO-02"),
        block_spec: {
          image: "india-physical-outline", // not in MAP_ASSETS
          width: 21000,
          height: 29700,
          tolerance: 900,
          source_url: "https://www.d-maps.com/carte.php?num_car=346025&lang=en",
          sha256: "0000000000000000000000000000000000000000000000000000000000000",
        },
      };

      const onChange = vi.fn();
      const { container } = render(<MapPointItem item={mapItem} value={null} onChange={onChange} />);

      // The form is strictly sequential, so this item must still unlock
      // Next — it just says plainly that it is lost rather than pretending
      // it was skipped or will be ignored.
      expect(container.textContent).toMatch(/didn't load/i);
      expect(onChange).toHaveBeenCalledWith({ point: { x: 0, y: 0 } });
    });

    it("falls back to the missing-map message when the server's hash doesn't match the vendored file", async () => {
      const { MapPointItem } = await import("../MapPointItem");
      const mapItem: PlacementItem = {
        ...item("CBSE-G7-GEO-02"),
        block_spec: {
          ...(item("CBSE-G7-GEO-02").block_spec as Record<string, unknown>),
          sha256: "deadbeef00000000000000000000000000000000000000000000000000000",
        } as PlacementItem["block_spec"],
      };

      const onChange = vi.fn();
      const { container } = render(<MapPointItem item={mapItem} value={null} onChange={onChange} />);

      // A hash mismatch means the file the server plotted answer_key.point
      // against may not be the file we're about to render — never trust a
      // possibly-stale asset over a graded coordinate space.
      expect(container.textContent).toMatch(/didn't load/i);
      expect(onChange).toHaveBeenCalledWith({ point: { x: 0, y: 0 } });
    });
  });

  describe("chart", () => {
    it("sends the bar id as a single-item selected array", async () => {
      const { onChange } = renderItem(item("CBSE-G6-GEO-03"));
      await userEvent.click(screen.getByLabelText("Jul: 90"));
      expect(onChange).toHaveBeenCalledWith({ selected: ["jul"] });
    });

    it("replaces the selection rather than adding to it", async () => {
      const { onChange } = renderItem(item("CBSE-G6-GEO-03"), { selected: ["jun"] });
      await userEvent.click(screen.getByLabelText("Aug: 70"));
      expect(onChange).toHaveBeenCalledWith({ selected: ["aug"] });
      expect(onChange).not.toHaveBeenCalledWith({ selected: expect.arrayContaining(["jun", "aug"]) });
    });
  });

  describe("Hindi items", () => {
    it("tags Devanagari content with lang=hi so it gets the Mukta stack", () => {
      renderItem(item("CBSE-G6-HIN-01"));
      const prompt = screen.getByText("इनमें से कौन सा शब्द संज्ञा है?");
      expect(prompt).toHaveAttribute("lang", "hi");
    });
  });

  describe("every item", () => {
    it("never leaks an answer key or explanation into the form", () => {
      for (const placementItem of PLACEMENT_ITEMS) {
        expect(placementItem).not.toHaveProperty("answer_key");
        expect(placementItem).not.toHaveProperty("explanation");
      }
    });

    it("shows no marks, score or correctness while answering", () => {
      renderItem(item("CBSE-G6-MATH-01"));
      expect(screen.queryByText(/mark/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
    });

    /**
     * A batch mixes 3–4 subjects across its cards, so — unlike a screen with
     * one subject heading — every card has to name its own subject or a
     * student answers a Geography question thinking it's English.
     */
    it("shows the item's own subject, since a batch mixes several", () => {
      renderItem(item("CBSE-G6-GEO-01"));
      expect(screen.getByText(/Geography/)).toBeInTheDocument();
    });
  });
});
