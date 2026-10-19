import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { lastUpload, sourcesFixture } from "@/test/msw/handlers/sources";
import { syntheticPdf, installNodeMultipart } from "@/test/multipart";
import { resetSubjectCatalogForTests } from "@/features/subjects/subjectCatalog";
import { usePartnerStore } from "@/features/partner/store/usePartnerStore";

vi.mock("framer-motion", async () => (await import("../visuals/__tests__/framerPassthrough")).framerPassthrough());
// pdf-lib can't read a SYNTHETIC byte string; the preview's only job here is reporting the page count.
vi.mock("../PageWisePreview", async () => {
  const { useEffect } = await import("react");
  return {
    PageWisePreview: ({ onPageCount }: { onPageCount?: (n: number) => void }) => {
      useEffect(() => onPageCount?.(3), [onPageCount]);
      return null;
    },
  };
});

import { CurriculumIngestion } from "../CurriculumIngestion";
import { strandCodeFrom } from "../LearningOutcomePicker";

installNodeMultipart();

beforeEach(() => {
  sourcesFixture.reset();
  resetSubjectCatalogForTests();
  usePartnerStore.setState({ subjects: [], subjectPagination: { total_count: 0, limit: 20, offset: 0 } });
  localStorage.setItem("gened_auth_token", "token-synthetic");
});

async function pick(label: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: option }));
}

async function fillValidForm() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [syntheticPdf()] } });
  await waitFor(() => expect(screen.getByLabelText("Last Page")).toHaveValue(3));
  await pick("Grade", "Grade 6");
  await pick("Subject", "Mathematics");
  fireEvent.change(screen.getByLabelText("Edition"), { target: { value: "SYNTHETIC TEST DATA" } });
  fireEvent.change(screen.getByLabelText("Book Title"), { target: { value: "SYNTHETIC Book" } });
  fireEvent.change(screen.getByLabelText("Chapter No."), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Chapter Title"), { target: { value: "SYNTHETIC chapter" } });
  fireEvent.click(await screen.findByText("SYNTHETIC outcome two"));
}

const submit = () => screen.getByRole("button", { name: "Upload & Start" });

describe("CurriculumIngestion — upload a chapter source", () => {
  it("maps the chapter to learning outcomes and a strand, uploads it and queues the run", async () => {
    const onClose = vi.fn();
    render(<CurriculumIngestion onClose={onClose} />);
    await fillValidForm();

    // The first outcome's competency suggests a new strand; existing strands are offered too.
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Strand" })).toHaveTextContent("New: fractions_decimals"));
    expect(submit()).toBeEnabled();
    fireEvent.click(submit());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(lastUpload).toMatchObject({
      board: "CBSE",
      publisher: "NCERT",
      subject: "Mathematics",
      grade: "6",
      book_title: "SYNTHETIC Book",
      edition_label: "SYNTHETIC TEST DATA",
      chapter_ordinal: "2",
      chapter_title: "SYNTHETIC chapter",
      first_pdf_page: "1",
      last_pdf_page: "3",
      strand: "fractions_decimals",
      lo_codes: ["G6-MATH-LO1.2.1"],
    });
    expect(usePartnerStore.getState().subjects[0]).toMatchObject({ title: "SYNTHETIC chapter", state: "queued" });
  });

  it("needs a learning outcome and a page range inside the PDF", async () => {
    render(<CurriculumIngestion onClose={vi.fn()} />);
    await fillValidForm();
    fireEvent.click(screen.getByText("SYNTHETIC outcome two")); // unselect
    expect(submit()).toBeDisabled();

    fireEvent.click(screen.getByText("SYNTHETIC outcome two"));
    fireEvent.change(screen.getByLabelText("Last Page"), { target: { value: "9" } });
    expect(screen.getByText(/Pages must be within 1 to 3/)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("keeps the form open and shows the server's reason when the upload is refused", async () => {
    sourcesFixture.reset();
    const onClose = vi.fn();
    render(<CurriculumIngestion onClose={onClose} />);
    await fillValidForm();
    // Pretend the PDF reported more pages than the server finds, so the server refuses the range.
    fireEvent.change(screen.getByLabelText("Last Page"), { target: { value: "3" } });
    const { server } = await import("@/test/msw/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/v1/sources`, () =>
        HttpResponse.json({ message: "You already uploaded these pages of this PDF." }, { status: 409 }),
      ),
    );
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("You already uploaded these pages of this PDF.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("refuses a PDF over the upload limit before sending it", () => {
    render(<CurriculumIngestion onClose={vi.fn()} />);
    const big = syntheticPdf("big.pdf", "x".repeat(31 * 1024 * 1024));
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [big] } });
    expect(screen.getByText(/larger than 30 MB/)).toBeInTheDocument();
  });
});

describe("strandCodeFrom", () => {
  it("turns a competency name into a strand code the backend accepts", () => {
    expect(strandCodeFrom("Fractions & decimals")).toBe("fractions_decimals");
    expect(strandCodeFrom("2D shapes")).toBe("strand_2d_shapes");
    expect(strandCodeFrom("x".repeat(80))).toHaveLength(60);
  });
});
