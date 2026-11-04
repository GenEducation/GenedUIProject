import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { PartnerBook } from "@/features/partner/types/sources";
import { BookPicker } from "../BookPicker";

/** SYNTHETIC books, as `GET /v1/sources/books` returns them (newest first). */
const book = (title: string, edition: string, chapters = 1): PartnerBook => ({
  book_title: title, edition_label: edition, board: "cbse", publisher: "synthetic_press", subject: "Mathematics",
  grade: 6, chapters, last_used_at: "2026-01-01T00:00:00Z",
});
const BOOKS = [book("SYNTHETIC Algebra", "SYNTHETIC 2025", 3), book("SYNTHETIC Geometry", "SYNTHETIC 2024")];

function Harness({ books = BOOKS, onPick = vi.fn() }: { books?: PartnerBook[]; onPick?: (b: PartnerBook) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <label htmlFor="b">Book Title</label>
      <BookPicker id="b" value={value} onChange={setValue} books={books} className=""
        onPick={(b) => { setValue(b.book_title); onPick(b); }} />
    </>
  );
}

const box = () => screen.getByRole("combobox", { name: "Book Title" });

describe("BookPicker", () => {
  it("offers the partner's past books on focus, with edition and chapter count", () => {
    render(<Harness />);
    fireEvent.focus(box());
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "SYNTHETIC AlgebraSYNTHETIC 2025 · Grade 6 · 3 chapters",
      "SYNTHETIC GeometrySYNTHETIC 2024 · Grade 6 · 1 chapter",
    ]);
  });

  it("narrows the list as the partner types, and picks one by click", () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    fireEvent.change(box(), { target: { value: "geo" } });
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options).toHaveLength(1);
    fireEvent.click(options[0]);
    expect(onPick).toHaveBeenCalledWith(BOOKS[1]);
    expect(box()).toHaveValue("SYNTHETIC Geometry");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("picks with the keyboard, and Escape closes the list", () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    fireEvent.focus(box());
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(BOOKS[1]);
  });

  it("keeps a new name typed, and is a plain text box with no past books", () => {
    render(<Harness books={[]} />);
    fireEvent.change(box(), { target: { value: "SYNTHETIC New Book" } });
    expect(box()).toHaveValue("SYNTHETIC New Book");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
