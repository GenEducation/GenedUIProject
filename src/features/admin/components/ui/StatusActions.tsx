"use client";

import { Check, RotateCcw, Ban, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** The link statuses the console can set on enrollments and assignments. */
export type LinkStatus = "APPROVED" | "REJECTED" | "REVOKED";

/**
 * Only the moves that make sense from where a link is now: a pending request
 * is approved or rejected, a live link is revoked, a closed one can be
 * re-approved. Showing all three on every row (two of them no-ops or
 * nonsense) was the old screen's main source of misclicks.
 */
export function transitionsFrom(status: string): LinkStatus[] {
  switch (status.toUpperCase()) {
    case "PENDING":
      return ["APPROVED", "REJECTED"];
    case "APPROVED":
      return ["REVOKED"];
    case "REJECTED":
    case "REVOKED":
      return ["APPROVED"];
    default:
      return ["APPROVED", "REJECTED", "REVOKED"];
  }
}

const LOOK: Record<
  LinkStatus,
  { label: (from: string) => string; variant: "primary" | "destructive"; Icon: typeof Check }
> = {
  APPROVED: {
    label: (from) => (from.toUpperCase() === "PENDING" ? "Approve" : "Re-approve"),
    variant: "primary",
    Icon: Check,
  },
  REJECTED: { label: () => "Reject", variant: "destructive", Icon: X },
  REVOKED: { label: () => "Revoke", variant: "destructive", Icon: Ban },
};

export function StatusActions({
  status,
  onSet,
  busy = false,
}: {
  status: string;
  onSet: (next: LinkStatus) => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {transitionsFrom(status).map((next) => {
        const { label, variant, Icon } = LOOK[next];
        const isReapprove = next === "APPROVED" && status.toUpperCase() !== "PENDING";
        const Glyph = isReapprove ? RotateCcw : Icon;
        return (
          <Button
            key={next}
            size="sm"
            variant={isReapprove ? "secondary" : variant}
            disabled={busy}
            leadingIcon={<Glyph size={14} />}
            onClick={() => onSet(next)}
          >
            {label(status)}
          </Button>
        );
      })}
    </div>
  );
}

/** Initial tab from `?status=` so the Overview can link straight to, say, pending requests. */
export function statusFromQuery(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("status")?.toUpperCase() || undefined;
}
