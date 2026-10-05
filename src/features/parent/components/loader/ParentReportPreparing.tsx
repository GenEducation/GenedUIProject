"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { usePortalBusy } from "./PortalProgress";

const STEPS = ["Collecting sessions", "Scoring each subject", "Writing insights"];
const STEP_MS = 1300;

/**
 * Shown while a child's report card is being put together, in the parent's
 * voice. The steps follow the order the report is built in; they advance on a
 * timer and hold on the last one until the report arrives.
 */
export function ParentReportPreparing({ childName, avatar }: { childName?: string; avatar?: string }) {
  usePortalBusy(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step]);

  const first = childName?.trim().split(/\s+/)[0];

  return (
    <div className="flex min-h-[420px] items-center justify-center p-6 font-[family-name:var(--font-display)]">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-2xl border border-white/70 bg-white/55 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_30px_-18px_rgba(19,41,61,0.28)] backdrop-blur-xl"
      >
        {avatar && (
          <span className="mx-auto block h-16 w-16 overflow-hidden rounded-full ring-4 ring-white shadow-[0_10px_24px_-12px_rgba(19,41,61,0.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- small avatar */}
            <img src={avatar} alt="" className="h-full w-full scale-[1.035] object-cover" />
          </span>
        )}
        <p className="mt-4 text-[17px] font-bold text-[#13293D]">
          Preparing {first ? `${first}'s` : "the"} report card
        </p>
        <ol className="mx-auto mt-5 w-fit space-y-2.5 text-left">
          {STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "current" : "pending";
            return (
              <li key={label} className="flex items-center gap-2.5 text-[14px]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {state === "done" ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16A36B] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : state === "current" ? (
                    <span className="h-4 w-4 rounded-full border-2 border-[#CDEEDF] border-t-[#16A36B] motion-safe:animate-spin" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[#C7D3D9]" />
                  )}
                </span>
                <span className={state === "pending" ? "text-[#5E7186]/70" : state === "current" ? "font-semibold text-[#13293D]" : "text-[#13293D]"}>
                  {label}
                  {state === "current" ? "…" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
