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

  it("closes once the chapter is saved even when its run does not start", async () => {
    const onClose = vi.fn();
    render(<CurriculumIngestion onClose={onClose} />);
    await fillValidForm();
    const { server } = await import("@/test/msw/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.post(`${process.env.NEXT_PUBLIC_API_URL}/v1/sources/:id/ingestions`, () =>
        HttpResponse.json({ message: "SYNTHETIC queue unavailable" }, { status: 503 }),
      ),
    );
    fireEvent.click(submit());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(usePartnerStore.getState().uploadNotice).toBe("Uploaded; it didn't start — press Start");
  });

  it("takes the partner to the first empty field instead of uploading an incomplete form", async () => {
    // jsdom has no layout, so no scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
    const onClose = vi.fn();
    render(<CurriculumIngestion onClose={onClose} />);
    await fillValidForm();
    fireEvent.change(screen.getByLabelText("Book Title"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Chapter Title"), { target: { value: "" } });

    fireEvent.click(submit());

    expect(screen.getByLabelText("Book Title")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Add Book Title to upload");
    expect(lastUpload).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("refuses a PDF over the upload limit before sending it", () => {
    render(<CurriculumIngestion onClose={vi.fn()} />);
    const big = syntheticPdf("big.pdf", "x".repeat(51 * 1024 * 1024));
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [big] } });
    expect(screen.getByText(/larger than 50 MB/)).toBeInTheDocument();
  });

  it("accepts a PDF between the old 30 MB cap and the backend's 50 MB", () => {
    render(<CurriculumIngestion onClose={vi.fn()} />);
    const mid = syntheticPdf("mid.pdf", "x".repeat(40 * 1024 * 1024));
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [mid] } });
    expect(screen.queryByText(/larger than/)).not.toBeInTheDocument();
  });
});
