"use client";

import type { ReactNode } from "react";

/** The light card every Learning Signal panel sits in. */
export function Panel({
  title,
  subtitle,
  icon,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ls-card p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
          <div>
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: "var(--ls-ink)" }}>
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs" style={{ color: "var(--ls-muted)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

/** Rounded square behind a panel's lucide icon, tinted to the panel's tone. */
export function PanelIcon({ children, tone = "emerald" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-lg"
      style={{ background: `var(--ls-${tone}-soft)`, color: `var(--ls-${tone})` }}
    >
      {children}
    </span>
  );
}

/** Shown when a panel's endpoint returned nothing at all. */
export function PanelEmpty({ children = "No data yet" }: { children?: ReactNode }) {
  return (
    <div
      className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-[13px]"
      style={{ borderColor: "var(--ls-border-strong)", color: "var(--ls-faint)" }}
    >
      {children}
    </div>
  );
}

/** Horizontal progress rail used across the onboarding and quality panels. */
export function Meter({
  fraction,
  color,
  track = "var(--ls-track)",
  height = 8,
}: {
  fraction: number;
  color: string;
  track?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0)) * 100;
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ background: track, height }}
      role="presentation"
    >
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
