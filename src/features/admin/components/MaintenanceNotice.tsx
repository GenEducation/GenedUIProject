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
import { MAINTENANCE_COPY } from "../maintenance";

// The admin console is dark; Modal's panel is light by default. `panelStyle`
// is the component's documented seam for scoped theming (see TestReadyModal).
const PANEL_STYLE: React.CSSProperties = {
  background: "#122D30",
  border: "1px solid rgb(255 255 255 / 0.10)",
};

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
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={MAINTENANCE_COPY.title}
      panelStyle={PANEL_STYLE}
    >
      <div className="px-6 py-6 text-white">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#075E63]/15 text-[#075E63]">
            <Wrench size={18} />
          </span>
          {/* Visual only — Modal's `title` carries the accessible name. */}
          <span className="text-base font-semibold">
            {screenLabel ?? MAINTENANCE_COPY.title}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-white/60">{MAINTENANCE_COPY.body}</p>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#075E63] px-4 py-2 text-sm font-medium text-white hover:bg-[#075E63]/85"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function MaintenancePanel({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft size={16} /> Back to overview
      </button>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-6 py-8">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#075E63]/15 text-[#075E63]">
            <Wrench size={18} />
          </span>
          <h2 className="text-base font-semibold text-white">{MAINTENANCE_COPY.title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-white/60">
          {MAINTENANCE_COPY.body}
        </p>
      </div>
    </div>
  );
}
