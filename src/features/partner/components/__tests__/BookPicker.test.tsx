import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import type { PartnerBook } from "@/features/partner/types/sources";
import { BookPicker } from "../BookPicker";

/** SYNTHETIC books, as `GET /v1/sources/books` returns them (newest first). */
const book = (title: string, edition: string, chapters = 1): PartnerBook => ({
  book_title: title,
  edition_label: edition,
  board: "cbse",
  publisher: "synthetic_press",
  subject: "Mathematics",
  grade: 6,
  chapters,
  last_used_at: "2026-01-01T00:00:00Z",
});
const BOOKS = [
  book("SYNTHETIC Algebra", "SYNTHETIC 2025", 3),
  book("SYNTHETIC Geometry", "SYNTHETIC 2024"),
];

function Harness({
  books = BOOKS,
  onPick = vi.fn(),
}: {
  books?: PartnerBook[];
  onPick?: (b: PartnerBook) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <>
      <label htmlFor="b">Book Title</label>
      <BookPicker
        id="b"
        value={value}
        onChange={setValue}
        books={books}
        className=""
        onPick={(b) => {
          setValue(b.book_title);
          onPick(b);
        }}
      />
    </>
  );
}

const box = () => screen.getByRole("combobox", { name: "Book Title" });

describe("BookPicker", () => {
  it("offers the partner's past books on focus, with edition and chapter count", async () => {
    render(<Harness />);
    fireEvent.focus(box());
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "SYNTHETIC AlgebraSYNTHETIC 2025Grade 6·3 chapters",
      "SYNTHETIC GeometrySYNTHETIC 2024Grade 6·1 chapter",
    ]);
    expect(
      screen.getByText("Pick one of your 2 books, or type a new title."),
    ).toBeInTheDocument();
  });

  it("ends the list with filing a typed new name as a new book, and says so under the box", async () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    fireEvent.change(box(), { target: { value: "SYNTHETIC Alg 2" } });
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "File as a new book: “SYNTHETIC Alg 2”",
    ]);
    fireEvent.click(options[0]);
    expect(onPick).not.toHaveBeenCalled();
    expect(box()).toHaveValue("SYNTHETIC Alg 2");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(screen.getByText(/Files as a new book/)).toBeInTheDocument();
  });

  it("says a picked book adds to that book, and reopens on the chevron", async () => {
    render(<Harness />);
    fireEvent.focus(box());
    fireEvent.click(
      within(screen.getByRole("listbox")).getAllByRole("option")[0],
    );
    expect(
      screen.getByText(
        "Adds to a book you filed before · SYNTHETIC 2025 · 3 chapters",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show your books" }));
    const chosen = within(screen.getByRole("listbox")).getByRole("option", {
      selected: true,
    });
    expect(chosen).toHaveTextContent("SYNTHETIC Algebra");
  });

  it("narrows the list as the partner types, and picks one by click", async () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    fireEvent.change(box(), { target: { value: "geo" } });
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "SYNTHETIC GeometrySYNTHETIC 2024Grade 6·1 chapter",
      "File as a new book: “geo”",
    ]);
    fireEvent.click(options[0]);
    expect(onPick).toHaveBeenCalledWith(BOOKS[1]);
    expect(box()).toHaveValue("SYNTHETIC Geometry");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("matches by words, so a near-identical name shows the books it would duplicate", async () => {
    const books = [
      book("SYNTHETIC Prakash-2", "SYNTHETIC 2026"),
      book("SYNTHETIC Prakash Part 2", "SYNTHETIC 2024"),
      book("SYNTHETIC Prakash Part 1", "SYNTHETIC 2024"),
    ];
    render(<Harness books={books} />);
    fireEvent.change(box(), { target: { value: "synthetic prakash 2" } });
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "SYNTHETIC Prakash-2SYNTHETIC 2026Grade 6·1 chapter",
      "SYNTHETIC Prakash Part 2SYNTHETIC 2024Grade 6·1 chapter",
      "File as a new book: “synthetic prakash 2”",
    ]);
  });

  it("picks with the keyboard, and Escape closes the list", async () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    fireEvent.focus(box());
    fireEvent.keyDown(box(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(BOOKS[1]);
  });

  it("keeps a new name typed, and is a plain text box with no past books", async () => {
    render(<Harness books={[]} />);
    fireEvent.change(box(), { target: { value: "SYNTHETIC New Book" } });
    expect(box()).toHaveValue("SYNTHETIC New Book");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });
});
