import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reported } from "../Reported";
import type { Reading } from "../reportTypes";

describe("Reported", () => {
  it("renders OK state with value and unit", () => {
    const reading: Reading<number> = {
      state: "OK",
      value: 42,
      unit: "°C",
      source_check: "system.thermal.temperature",
      note: null,
    };
    render(<Reported reading={reading} />);
    const el = screen.getByText("42 °C");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-white/80");
  });

  it("renders NOT_REPORTED as grey and italic, never amber", () => {
    const reading: Reading = {
      state: "NOT_REPORTED",
      value: null,
      unit: null,
      source_check: "network.wifi.association",
      note: null,
    };
    render(<Reported reading={reading} />);
    const el = screen.getByText("not reported by this firmware");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-white/40");
    expect(el.className).toContain("italic");
    expect(el.className).not.toContain("amber");
  });

  it("renders NOT_IN_METRICS as muted dash", () => {
    const reading: Reading = {
      state: "NOT_IN_METRICS",
      value: null,
      unit: null,
      source_check: "identity.device.fingerprint",
      note: null,
    };
    render(<Reported reading={reading} />);
    const el = screen.getByText("—");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-white/40");
    expect(el.className).not.toContain("amber");
  });

  it("renders UNKNOWN as amber with note, never green", () => {
    const reading: Reading = {
      state: "UNKNOWN",
      value: null,
      unit: null,
      source_check: "audio.card.enumeration",
      note: "audio server unreachable",
    };
    render(<Reported reading={reading} />);
    const el = screen.getByText("audio server unreachable");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-amber-300");
    expect(el.className).not.toContain("emerald");
    expect(el.className).not.toContain("green");
  });

  it("renders SKIPPED as muted 'not applicable on this hardware'", () => {
    const reading: Reading = {
      state: "SKIPPED",
      value: null,
      unit: null,
      source_check: "power.battery.configuration",
      note: "no battery hardware",
    };
    render(<Reported reading={reading} />);
    const el = screen.getByText("not applicable on this hardware");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-white/40");
    expect(el.className).not.toContain("amber");
  });

  it("renders PARTIAL with value and 'needs root' badge", () => {
    const reading: Reading<string> = {
      state: "PARTIAL",
      value: "eth0",
      unit: null,
      source_check: "network.interfaces.addresses",
      note: "read without root",
    };
    render(<Reported reading={reading} />);
    expect(screen.getByText(/eth0/)).toBeInTheDocument();
    const badge = screen.getByText("needs root");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-white/10");
  });

  it("renders dash fallback when reading is null or undefined", () => {
    const { rerender } = render(<Reported reading={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    rerender(<Reported reading={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
