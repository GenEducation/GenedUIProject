"use client";

import { PILOT_SEATS, PILOT_START } from "@/constants/campaign";
import { useSeatsLeft } from "./pilotSeats";

/** The seats-left counter. "meter" is the hero's headline card (big number +
 *  a row of seats, taken ones filled); "pill" is the compact one in the sheet. */
export function SeatsLeft({ variant = "pill", className = "" }: { variant?: "meter" | "pill"; className?: string }) {
  const n = useSeatsLeft();
  const label = n === 1 ? "seat left" : "seats left";

  if (variant === "pill") {
    return (
      <span className={`gc-seats ${className}`.trim()} aria-live="polite">
        Only <b key={n}>{n}</b> {label}
      </span>
    );
  }

  const taken = PILOT_SEATS - n;
  return (
    <div className={`gc-seatmeter ${className}`.trim()} aria-live="polite">
      <div className="gc-seatmeter-top">
        <span className="gc-seatmeter-live">Filling fast</span>
        <span>Free pilot · Starts {PILOT_START}</span>
      </div>
      <p className="gc-seatmeter-count">
        <b key={n}>{n}</b>
        <span>
          {label}
          <small>of {PILOT_SEATS} families</small>
        </span>
      </p>
      <div className="gc-seatmeter-seats" aria-hidden>
        {Array.from({ length: PILOT_SEATS }, (_, i) => (
          <i key={i} className={i < taken ? "taken" : undefined} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
