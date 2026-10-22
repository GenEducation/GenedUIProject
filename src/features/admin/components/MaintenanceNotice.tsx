"use client";

/**
 * The two faces of "this screen is under maintenance".
 *
 * `MaintenanceModal` answers a click on a gated sidebar entry: the admin is
 * still on a working screen, the dialog explains why they did not move, and
 * dismissing it returns them to where they were.
 *
 * `MaintenancePanel` answers a direct visit — a typed URL, a bookmark, a
 * browser Back into a gated route. There is deliberately nothing to dismiss
 * here: a dialog over an empty shell would leave the admin staring at a blank
 * content area with no way to get the message back. An inline panel keeps the
 * sidebar in reach and offers one click to somewhere that works.
 */

import { ArrowLeft, Wrench } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MAINTENANCE_COPY } from "../maintenance";
import { PageHeader } from "./ui/PageHeader";

export function MaintenanceModal({
  open,
  screenLabel,
  onClose,
}: {
  open: boolean;
  /** The nav label that was clicked, so the notice names the right screen. */
  screenLabel: string | null;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title={MAINTENANCE_COPY.title}>
      <div className="px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-bg text-warning-ink">
            <Wrench size={18} />
          </span>
          {/* Visual only — Modal's `title` carries the accessible name. */}
          <span>
            <span className="block font-serif text-lg font-bold text-ink">
              {screenLabel ?? MAINTENANCE_COPY.title}
            </span>
            <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-warning-ink">
              {MAINTENANCE_COPY.title}
            </span>
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted">{MAINTENANCE_COPY.body}</p>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </div>
    </Modal>
  );
}

export function MaintenancePanel({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <PageHeader
        title={MAINTENANCE_COPY.title}
        subtitle="This screen is paused while the console moves to the new backend."
        actions={
          <Button variant="secondary" leadingIcon={<ArrowLeft size={16} />} onClick={onBack}>
            Back to overview
          </Button>
        }
      />

      <div className="flex flex-col items-start gap-4 rounded-2xl border border-warning-border bg-warning-bg/60 p-6 sm:flex-row sm:p-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-warning-ink shadow-[0_1px_2px_rgba(18,45,48,.06)]">
          <Wrench size={22} />
        </span>
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">Nothing has been lost</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-warning-ink">
            {MAINTENANCE_COPY.body}
          </p>
        </div>
      </div>
    </div>
  );
}
