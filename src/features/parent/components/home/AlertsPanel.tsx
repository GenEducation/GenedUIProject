"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GLASS, ICON, LIFT_SOFT } from "./theme";

/** Shape the backend's alerts will arrive in; none are produced yet. */
export interface ParentAlert {
  id: string;
  severity: "warning" | "info" | "success";
  message: string;
  /** Where "View Details" goes, e.g. a subject page. */
  href?: string;
}

const SEVERITY: Record<ParentAlert["severity"], { bar: string; tint: string; icon: string }> = {
  warning: { bar: "#EC3F72", tint: "#FCE3EB", icon: "alert_math_warning" },
  info: { bar: "#F5A50B", tint: "#FDF0CF", icon: "alert_hindi_clock" },
  success: { bar: "#16A36B", tint: "#DDF4E9", icon: "alert_science_badge" },
};

export function AlertsPanel({ alerts }: { alerts: ParentAlert[] }) {
  return (
    <section
      aria-label="Recent Alerts & Updates"
      className={`flex min-w-0 flex-col rounded-2xl p-5 ${GLASS} ${LIFT_SOFT}`}
    >
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pp-mint)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
          <img src={ICON("alerts_icon")} alt="" width={22} height={22} />
        </span>
        <h3 className="text-[17px] font-bold text-[var(--pp-ink)]">Recent Alerts &amp; Updates</h3>
      </header>

      {alerts.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--pp-green)]/20 bg-white/40 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--pp-mint)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
            <img src={ICON("alerts_icon")} alt="" width={24} height={24} className="opacity-70" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-[var(--pp-ink)]">No alerts right now</p>
          <p className="mt-1 max-w-[16rem] text-[13px] text-[var(--pp-ink-soft)]">
            We&apos;ll let you know here when something needs your attention.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((alert) => {
            const tone = SEVERITY[alert.severity];
            return (
              <li
                key={alert.id}
                className="flex items-center gap-3 rounded-xl border border-white/80 border-l-4 bg-white/60 py-3 pl-3 pr-3"
                style={{ borderLeftColor: tone.bar }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: tone.tint }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
                  <img src={ICON(tone.icon)} alt="" width={22} height={22} />
                </span>
                <p className="min-w-0 flex-1 text-[13.5px] font-medium text-[var(--pp-ink)]">{alert.message}</p>
                {alert.href && (
                  <Link
                    href={alert.href}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--pp-line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--pp-ink)] hover:bg-[var(--pp-mint)]/50"
                  >
                    View Details <ChevronRight size={14} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
