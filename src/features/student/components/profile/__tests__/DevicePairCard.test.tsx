import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { useStudentStore } from "@/features/student/store/useStudentStore";

import { DevicePairCard } from "../DevicePairCard";

// `POST /auth/device/pairing/confirm` answers `pushed: false` whenever the token couldn't also be pushed over MQTT,
// which is every time in production (no broker): the device collects its token by polling instead. That is still a
// successful pairing, so the card must not tell the student to redo it.
const BASE = process.env.NEXT_PUBLIC_API_URL || "";
const confirmAnswers = (body: Record<string, unknown>) =>
  server.use(http.post(`${BASE}/auth/device/pairing/confirm`, () => HttpResponse.json(body)));

async function pair(code = "BCDFGH") {
  render(<DevicePairCard index={0} />);
  fireEvent.click(screen.getByRole("button", { name: "Enter code" }));
  [...code].forEach((char, i) => {
    fireEvent.change(screen.getByLabelText(`Character ${i + 1} of ${code.length}`), { target: { value: char } });
  });
  fireEvent.click(screen.getByRole("button", { name: "Pair device" }));
  return screen.findByRole("status");
}

beforeEach(() => {
  localStorage.setItem("gened_auth_token", "token-synthetic");
  useStudentStore.setState({ studentProfile: { user_id: "u-synthetic", username: "synthetic", role: "STUDENT", grade: 6 } });
});

describe("Device pairing", () => {
  it("says the device is paired when the token was pushed to it", async () => {
    confirmAnswers({ status: "approved", pushed: true, student_id: "u-synthetic" });
    const status = await pair();
    expect(status).toHaveTextContent("Device paired!");
    expect(screen.queryByText(/couldn.t wake/)).toBeNull();
  });

  it("treats an approval the device will collect itself as success, not a failure to redo", async () => {
    confirmAnswers({ status: "approved", pushed: false, student_id: "u-synthetic" });
    const status = await pair();
    expect(status).toHaveTextContent("Approved: your device will finish pairing in a few seconds.");
    expect(status).toHaveTextContent("If it still shows a code after a minute, restart it and pair again.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/couldn.t wake/)).toBeNull();
  });

  it("explains where the code appears and how long it lasts", () => {
    render(<DevicePairCard index={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Enter code" }));
    expect(screen.getByText(/shows on your device.s screen while it isn.t paired/)).toBeInTheDocument();
    expect(screen.getByText(/valid for 10 minutes/)).toBeInTheDocument();
  });
});
