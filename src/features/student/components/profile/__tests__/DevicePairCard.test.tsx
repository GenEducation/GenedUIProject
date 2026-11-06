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

// The bots paired to this account (backend ADR 0043): listed on the card, removable, and refreshed after a pairing.
const BOT = {
  id: "b-1",
  label: "GenEd bot ·8CEA",
  paired_at: "2026-11-01T10:00:00Z",
  last_used_at: "2026-11-05T09:00:00Z",
  disconnects_at: "2026-12-05T09:00:00Z",
};

describe("Paired bots", () => {
  it("lists the student's bots with when each needs a new code", async () => {
    server.use(http.get(`${BASE}/v1/devices/bots`, () => HttpResponse.json([BOT])));
    render(<DevicePairCard index={0} />);
    expect(await screen.findByText("GenEd bot ·8CEA")).toBeInTheDocument();
    expect(screen.getByText(/Needs a new code after/)).toBeInTheDocument();
  });

  it("says when no bot is paired", async () => {
    render(<DevicePairCard index={0} />);
    expect(await screen.findByText("No bot paired yet.")).toBeInTheDocument();
  });

  it("removes a bot only after the student confirms", async () => {
    let deleted = "";
    server.use(
      http.get(`${BASE}/v1/devices/bots`, () => HttpResponse.json([BOT])),
      http.delete(`${BASE}/v1/devices/bots/:botId`, ({ params }) => {
        deleted = String(params.botId);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<DevicePairCard index={0} />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove GenEd bot ·8CEA" }));
    expect(screen.getByText(/It will ask for a new pairing code/)).toBeInTheDocument();
    expect(deleted).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("No bot paired yet.")).toBeInTheDocument();
    expect(deleted).toBe("b-1");
  });

  it("keeps the bot and says so when removing fails", async () => {
    server.use(
      http.get(`${BASE}/v1/devices/bots`, () => HttpResponse.json([BOT])),
      http.delete(`${BASE}/v1/devices/bots/:botId`, () => HttpResponse.json({ error_code: "SHARED_1900" }, { status: 500 })),
    );
    render(<DevicePairCard index={0} />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove GenEd bot ·8CEA" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText(/Couldn.t remove it/)).toBeInTheDocument();
    expect(screen.getByText("GenEd bot ·8CEA")).toBeInTheDocument();
  });

  it("shows the newly paired bot after a pairing", async () => {
    let calls = 0;
    server.use(http.get(`${BASE}/v1/devices/bots`, () => HttpResponse.json(calls++ === 0 ? [] : [BOT])));
    confirmAnswers({ status: "approved", pushed: false, student_id: "u-synthetic" });
    await pair();
    expect(await screen.findByText("GenEd bot ·8CEA")).toBeInTheDocument();
  });

  it("still lets the student pair when the list can't load", async () => {
    server.use(http.get(`${BASE}/v1/devices/bots`, () => HttpResponse.json({}, { status: 500 })));
    render(<DevicePairCard index={0} />);
    expect(await screen.findByText(/couldn.t be loaded right now/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter code" })).toBeInTheDocument();
  });
});
