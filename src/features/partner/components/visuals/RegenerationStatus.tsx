"use client";

import { useState } from "react";
import { ArrowRight, Loader2, RefreshCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { visualsService } from "../../services/visualsService";
import type { ReasonCode, VisualDetail } from "../../types/visuals";
import { ReasonFields } from "./ReasonFields";

interface RegenerationStatusProps {
  detail: VisualDetail;
  onOpen: (id: string) => void;
  /** Re-read the detail (after asking again, or on a 409). */
  onChanged: () => void;
}

/**
 * The "new version" story for a rejected visual: in progress (the detail hook
 * polls), ready (link to it), failed (try again), or never asked for (ask now).
 */
export function RegenerationStatus({ detail, onOpen, onChanged }: RegenerationStatusProps) {
  const regen = detail.regeneration;
  const previousReasons = detail.decision?.reason_codes ?? [];
  const [asking, setAsking] = useState(false);
  const [reasons, setReasons] = useState<ReasonCode[]>(previousReasons);
  const [note, setNote] = useState(detail.decision?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestNewVersion = async (codes: ReasonCode[], text: string | null) => {
    setSubmitting(true);
    setError(null);
    try {
      await visualsService.regenerate(detail.id, { reason_codes: codes, note: text });
      setAsking(false);
      onChanged();
    } catch (e) {
      const err = asError(e);
      setError(err.message || "Couldn't ask for a new version. Please try again.");
      if (err.status === 409) onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  if (detail.state !== "rejected") return null;

  if (regen && (regen.state === "queued" || regen.state === "claimed")) {
    return (
      <div role="status" className="rounded-2xl border border-[#1A3D2C]/10 bg-[#D1E6D9]/40 p-4 flex items-start gap-3">
        <Loader2 size={18} className="animate-spin text-[#1A3D2C] mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-bold text-[#1A3D2C]">Making a new version…</p>
          <p className="text-xs text-[#1A3D2C]/60 mt-0.5">
            This usually takes a minute or two. You can close this window; it keeps going.
          </p>
        </div>
      </div>
    );
  }

  if (regen?.state === "done" && regen.result_candidate_id) {
    const resultId = regen.result_candidate_id;
    return (
      <div className="rounded-2xl border border-[#1A3D2C]/10 bg-[#D1E6D9]/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm font-bold text-[#1A3D2C]">A new version is ready.</p>
        <Button trailingIcon={<ArrowRight size={14} />} onClick={() => onOpen(resultId)}>
          Review the new version
        </Button>
      </div>
    );
  }

  const failed = regen?.state === "failed";
  // Done without a result id is treated as nothing to show (shouldn't happen).
  if (regen && !failed) return null;

  const canRetryDirectly = failed && previousReasons.length > 0;

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 ${
        failed ? "border-red-200 bg-red-50/60" : "border-[#1A3D2C]/10 bg-white"
      }`}
    >
      {failed ? (
        <div className="flex items-start gap-3">
          <TriangleAlert size={18} className="text-red-500 mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-bold text-[#1A3D2C]">The new version couldn&apos;t be made.</p>
            {regen?.error && <p className="text-xs text-[#1A3D2C]/60 mt-0.5">{regen.error}</p>}
          </div>
        </div>
      ) : (
        <p className="text-sm font-bold text-[#1A3D2C]">No new version was asked for.</p>
      )}

      {asking ? (
        <>
          <ReasonFields reasons={reasons} onReasonsChange={setReasons} note={note} onNoteChange={setNote} />
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => setAsking(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              disabled={reasons.length === 0}
              loading={submitting}
              onClick={() => void requestNewVersion(reasons, note.trim() || null)}
            >
              Make a new version
            </Button>
          </div>
        </>
      ) : (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            leadingIcon={<RefreshCcw size={14} />}
            loading={submitting}
            onClick={() =>
              canRetryDirectly
                ? void requestNewVersion(previousReasons, detail.decision?.note ?? null)
                : setAsking(true)
            }
          >
            {failed ? "Try again" : "Make a new version"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
