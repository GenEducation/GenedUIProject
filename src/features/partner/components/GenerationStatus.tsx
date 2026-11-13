"use client";

import { Sparkles } from "lucide-react";
import type { BankRun } from "../types/sources";

const LABEL: Record<BankRun["state"], string> = {
  queued: "Waiting to start",
  running: "Writing questions now",
  ready: "Done",
  stopped: "Stopped",
  failed: "Failed",
};

const TONE: Record<BankRun["state"], string> = {
  queued: "bg-amber-50 text-amber-800",
  running: "bg-violet-50 text-violet-800",
  ready: "bg-emerald-50 text-emerald-800",
  stopped: "bg-slate-100 text-slate-700",
  failed: "bg-red-50 text-red-800",
};

/** The steps with a request still waiting or running, so each step can say GenEd is working on it. */
export function pendingSteps(runs: BankRun[]): Set<string> {
  return new Set(
    runs
      .filter((r) => r.state === "queued" || r.state === "running")
      .map((r) => r.section_key ?? "*"),
  );
}

/** GenEd's question writing for this chapter: each request, which step it is for, and where it stands. */
export function GenerationStatus({
  runs,
  titles,
  waiting,
  onShow,
}: {
  runs: BankRun[];
  titles: Record<string, string>;
  /** Steps with proposals waiting for the partner's decision, in the chapter's order. */
  waiting: string[];
  onShow: (sectionKey: string) => void;
}) {
  const recent = [...runs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  if (recent.length === 0) return null;
  const active = recent.some(
    (r) => r.state === "queued" || r.state === "running",
  );
  return (
    <section
      aria-label="GenEd's question writing"
      className="rounded-xl border border-violet-200 bg-white p-3 flex flex-col gap-2"
    >
      <p
        role="status"
        className="flex items-center gap-2 text-xs font-black text-violet-800"
      >
        <Sparkles size={14} aria-hidden />
        {active
          ? "GenEd is writing questions. This page updates by itself; you can keep working meanwhile."
          : "GenEd's question requests"}
      </p>
      <ul className="flex flex-col gap-1.5">
        {recent.map((r) => (
          <li
            key={r.run_id}
            className="flex flex-wrap items-center gap-2 text-xs text-[#122D30]/80"
          >
            <span
              className={`rounded-full px-2 py-0.5 font-bold ${TONE[r.state]}`}
            >
              {LABEL[r.state]}
            </span>
            <span className="font-bold">
              {r.section_key
                ? (titles[r.section_key] ?? r.section_key)
                : "Whole chapter"}
            </span>
            <span className="text-[#122D30]/50">
              asked {new Date(r.created_at).toLocaleString()}
            </span>
            {r.state === "ready" &&
              (() => {
                const target = r.section_key
                  ? waiting.includes(r.section_key)
                    ? r.section_key
                    : null
                  : (waiting[0] ?? null);
                return target ? (
                  <button
                    type="button" // eslint-disable-line no-restricted-syntax -- an inline text link inside a status row
                    className="font-bold text-[#075E63] underline"
                    onClick={() => onShow(target)}
                  >
                    Show the proposals waiting for you
                  </button>
                ) : (
                  <span className="text-[#122D30]/50">
                    nothing left waiting for your decision
                  </span>
                );
              })()}
            {(r.state === "failed" || r.state === "stopped") && r.detail && (
              <span className="basis-full text-[#122D30]/60">{r.detail}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
