import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// The backend requires subject+grade (rag-service 422s without them) and treats
// partner_id as resolvable server-side when omitted — this suite exists to pin
// that FigureView actually sends the two it must, and never blocks on the one it
// doesn't have a reliable client-side source for.

let activeChat: { subject?: string; grade?: string } | undefined;

vi.mock("../../store/useStudentStore", () => ({
  useStudentStore: (selector: (s: { activeChat?: typeof activeChat }) => unknown) =>
    selector({ activeChat }),
}));

const authFetchMock = vi.fn();
vi.mock("@/utils/authFetch", () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

// framer-motion's animated <img> isn't meaningfully different from a plain one here.
vi.mock("framer-motion", () => ({
  motion: { img: (props: Record<string, unknown>) => <img {...props} /> },
}));

import { FigureView } from "../FigureView";

beforeEach(() => {
  authFetchMock.mockReset();
  activeChat = undefined;
});

it("does not fetch, and stays in the loading state, until the active session's subject/grade are known", async () => {
  activeChat = undefined;

  render(<FigureView uuid="fig-1" />);

  expect(authFetchMock).not.toHaveBeenCalled();
  // The spinner, not the error card -- "not ready yet" must not read as a failure.
  expect(screen.queryByText(/error loading figure/i)).not.toBeInTheDocument();
});

it("fetches with subject+grade once the active session provides them, and never sends partner_id", async () => {
  activeChat = { subject: "Mathematics", grade: "6" };
  authFetchMock.mockResolvedValue({
    ok: true,
    blob: async () => new Blob(["fake-image-bytes"]),
  });
  // jsdom has no real blob URL implementation.
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();

  render(<FigureView uuid="fig-1" />);

  await waitFor(() => expect(authFetchMock).toHaveBeenCalledTimes(1));
  const [url] = authFetchMock.mock.calls[0];
  expect(url).toContain("/rag/retrieve/figure/fig-1?");
  expect(url).toContain("subject=Mathematics");
  expect(url).toContain("grade=6");
  expect(url).not.toContain("partner_id");
});

it("shows the error card when the fetch fails, not an infinite spinner", async () => {
  activeChat = { subject: "Mathematics", grade: "6" };
  authFetchMock.mockResolvedValue({ ok: false });

  render(<FigureView uuid="fig-1" />);

  await waitFor(() =>
    expect(screen.getByText(/error loading figure/i)).toBeInTheDocument()
  );
});
