"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2, RefreshCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { visualsService } from "../../services/visualsService";
import { REASON_LABELS, type ReasonCode, type VisualDetail } from "../../types/visuals";
import { ReasonFields } from "./ReasonFields";
import { composeNote, marksText, overLimit, type Mark } from "./markup";
import { MarksPreview } from "./MarksPreview";

interface RegenerationStatusProps {
  detail: VisualDetail;
  onOpen: (id: string) => void;
  /** Re-read the detail (after asking again, or on a 409). */
  onChanged: () => void;
  /** Changes marked on the picture; sent first in the note. */
  marks?: Mark[];
  /** The marks went with a request: the caller clears them. */
  onMarksSent?: () => void;
  /** Back to the picture to change the marks. */
  onEditMarks?: () => void;
}

/**
 * What to tell a partner about a failed redraw. The drawing service's "too many requests" refusal (HTTP 429,
 * `RESOURCE_EXHAUSTED`, quota or rate limits) reaches us as raw provider text; it means "busy, try later", so it is
 * said that way. Any other error is shown as the backend wrote it.
 */
export function regenerationErrorText(error: string): string {
  if (/\b429\b|RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(error)) {
    return "The drawing service is busy right now. Wait a few minutes, then try again.";
  }
  return error;
}

/**
 * The "new version" story for a rejected visual: in progress (the detail hook
 * polls), ready (link to it), failed (try again), or never asked for (ask now).
 */
export function RegenerationStatus({ detail, onOpen, onChanged, marks = [], onMarksSent, onEditMarks }: RegenerationStatusProps) {
  const regen = detail.regeneration;
  // Only a partner's own reasons can be sent again ("recropped" is the backend's).
  const previousReasons = (detail.decision?.reason_codes ?? []).filter((c): c is ReasonCode => c in REASON_LABELS);
  const [asking, setAsking] = useState(false);
  const [reasons, setReasons] = useState<ReasonCode[]>(previousReasons);
  const [note, setNote] = useState(detail.decision?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marked = marks.length > 0;
  // With marks, the form opens on its own: they need reasons to go with them.
  const showForm = asking || marked;
  // As when rejecting: the marks explain it, so "Something else" stands in until a reason is picked.
  useEffect(() => {
    if (marked) setReasons((r) => (r.length ? r : ["other"]));
  }, [marked]);

  const requestNewVersion = async (codes: ReasonCode[], text: string | null) => {
    setSubmitting(true);
    setError(null);
    try {
      await visualsService.regenerate(detail.id, { reason_codes: codes, note: text });
      setAsking(false);
      if (marked) onMarksSent?.();
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
      <div role="status" className="rounded-2xl border border-[#122D30]/10 bg-[#DCEBE7]/40 p-4 flex items-start gap-3">
        <Loader2 size={18} className="animate-spin text-[#122D30] mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-bold text-[#122D30]">Making a new version…</p>
          <p className="text-xs text-[#122D30]/60 mt-0.5">
            This usually takes a minute or two. You can close this window; it keeps going.
          </p>
        </div>
      </div>
    );
  }

  if (regen?.state === "done" && regen.result_candidate_id) {
    const resultId = regen.result_candidate_id;
    return (
      <div className="rounded-2xl border border-[#122D30]/10 bg-[#DCEBE7]/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm font-bold text-[#122D30]">A new version is ready.</p>
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
  const canAsk = reasons.length > 0 && overLimit(marks, note) === 0;

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 ${
        failed ? "border-red-200 bg-red-50/60" : "border-[#122D30]/10 bg-white"
      }`}
    >
      {failed ? (
        <div className="flex items-start gap-3">
          <TriangleAlert size={18} className="text-red-500 mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-bold text-[#122D30]">The new version couldn&apos;t be made.</p>
            {regen?.error && (
              // The provider's own wording stays on hover, for anyone reporting it.
              <p className="text-xs text-[#122D30]/60 mt-0.5" title={regen.error}>
                {regenerationErrorText(regen.error)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm font-bold text-[#122D30]">No new version was asked for.</p>
      )}

      {showForm ? (
        <>
          <MarksPreview marks={marks} onEdit={onEditMarks} />
          <ReasonFields
            reasons={reasons}
            onReasonsChange={setReasons}
            note={note}
            onNoteChange={setNote}
            reserved={marked ? marksText(marks).length + 1 : 0}
            onSubmit={() => {
              if (canAsk && !submitting) void requestNewVersion(reasons, composeNote(marks, note));
            }}
          />
          <div className="flex items-center justify-end gap-2">
            {overLimit(marks, note) > 0 && (
              <p role="alert" className="mr-auto text-[11px] font-bold text-red-600">
                {overLimit(marks, note)} characters too long. Shorten a mark or the note.
              </p>
            )}
            {!marked && (
              <Button variant="tertiary" onClick={() => setAsking(false)} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button
              disabled={!canAsk}
              loading={submitting}
              onClick={() => void requestNewVersion(reasons, composeNote(marks, note))}
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
