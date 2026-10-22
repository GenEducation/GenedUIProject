"use client";

import type { ReactNode } from "react";

export type PillTone = "success" | "pending" | "danger" | "info" | "neutral" | "brand";

const TONE_CLASS: Record<PillTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  // Citron: an achievement (a paid plan, a finished import) — a fill under ink, never citron text.
  brand: "bg-accent text-accent-ink ring-accent-deep/40",
  pending: "bg-warning-bg text-warning-ink ring-warning-border",
  danger: "bg-danger-bg text-danger-ink ring-danger/20",
  info: "bg-info/10 text-info ring-info/15",
  neutral: "bg-canvas text-muted ring-border",
};

const DOT_CLASS: Record<PillTone, string> = {
  success: "bg-emerald-500",
  brand: "bg-ink",
  pending: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted-light",
};

/** A short categorical label: role, plan, status. Text stays as the backend sends it. */
export function StatusPill({
  tone = "neutral",
  dot = false,
  title,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em] ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      {dot ? <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[tone]}`} /> : null}
      {children}
    </span>
  );
}

/** The tone each status the console shows maps to, so a colour is never guessed per screen. */
export function statusTone(status: string | null | undefined): PillTone {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
    case "COMPLETED":
    case "READY":
    case "ACTIVE":
      return "success";
    case "PENDING":
    case "QUEUED":
    case "REVIEW_NEEDED":
    case "REGISTERED":
      return "pending";
    case "RUNNING":
      return "info";
    case "REJECTED":
    case "REVOKED":
    case "FAILED":
    case "INVALID":
      return "danger";
    default:
      return "neutral";
  }
}
