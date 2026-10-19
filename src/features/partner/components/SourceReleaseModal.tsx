"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Loader2, Play, Rocket, ShieldCheck, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import { REJECT_REASONS, type ReleaseProposal, type ReleaseReason, type SourceRelease } from "../types/sources";
import { detailsOf, groupByKind, summarize } from "../utils/releaseSummary";
import type { Subject } from "../store/usePartnerStore";

interface SourceReleaseModalProps {
  /** The chapter whose release to review; null keeps the popup closed. */
  subject: Subject | null;
  onClose: () => void;
  /** Published: the registry refreshes. */
  onPublished: () => void;
  /** Queue the chapter's next run (used when there is nothing to review yet). */
  onRerun: (subject: Subject) => Promise<void>;
}

/**
 * Review and publish a chapter (ADR 0014 decision 10): every part of the run's
 * release (concepts, questions, lesson steps…) needs the partner's accept,
 * bound to the exact content shown; then the chapter is published and the
 * school's students can open it. Decisions are final, so each is sent as it is
 * made, and the release is reloaded after.
 */
export function SourceReleaseModal(props: SourceReleaseModalProps) {
  const { subject, onClose } = props;
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Review ${subject.title}` : "Review"}
      panelStyle={{ maxWidth: "min(920px, 100%)", background: "#F8F9F8" }}
    >
      {subject && <ReleaseBody key={subject.source_id} {...props} subject={subject} />}
    </Modal>
  );
}

function ReleaseBody({ subject, onClose, onPublished, onRerun }: SourceReleaseModalProps & { subject: Subject }) {
  const [data, setData] = useState<SourceRelease | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // a proposal id, a group kind, "all", "publish" or "rerun"

  const load = useCallback(async () => {
    try {
      setData(await sourcesService.release(subject.source_id));
      setLoadError(null);
    } catch (e) {
      setLoadError(asError(e).message || "Couldn't load this chapter's review.");
    }
  }, [subject.source_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (key: string, proposals: ReleaseProposal[], decision: "accept" | "reject", reason?: ReleaseReason) => {
    setBusy(key);
    setError(null);
    try {
      const results = await sourcesService.decideRelease(
        subject.source_id,
        proposals.map((p) => ({
          proposal_id: p.id,
          content_hash: p.content_hash,
          decision,
          reasons: [decision === "accept" ? "accepted_as_is" : (reason as ReleaseReason)],
        })),
      );
      const refused = results.filter((r) => !r.recorded);
      if (refused.length) setError(`${refused.length} decision${refused.length === 1 ? " wasn't" : "s weren't"} recorded: ${refused[0].error ?? "refused"}`);
      await load();
    } catch (e) {
      setError(asError(e).message || "The decision wasn't saved. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!data?.release.artifact_hash) return;
    setBusy("publish");
    setError(null);
    try {
      await sourcesService.publishRelease(subject.source_id, data.release.artifact_hash);
      await load();
      onPublished();
    } catch (e) {
      setError(asError(e).message || "The chapter wasn't published. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const rerun = async () => {
    setBusy("rerun");
    try {
      await onRerun(subject);
      onClose();
    } catch (e) {
      setLoadError(asError(e).message || "The chapter didn't start. Please try again.");
      setBusy(null);
    }
  };

  const proposals = data?.proposals ?? [];
  const pending = proposals.filter((p) => p.state === "pending");
  const rejected = proposals.filter((p) => p.state === "rejected");
  const accepted = proposals.length - pending.length - rejected.length;
  const published = data?.release.state === "published";
  const blocked = data?.release.state === "blocked";
  const canPublish = !!data && !published && !blocked && pending.length === 0 && rejected.length === 0 && !!data.release.artifact_hash;

  return (
    <div className="flex flex-col min-h-full">
      <header className="shrink-0 flex items-start gap-4 px-5 md:px-7 pt-6 pb-4 bg-white border-b border-[#1A3D2C]/5">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#1A3D2C] text-white flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">Review &amp; publish</p>
          <h2 className="text-lg md:text-xl font-black text-[#1A3D2C] tracking-tight truncate">{subject.title}</h2>
          <p className="text-xs text-[#1A3D2C]/60 mt-1 max-w-xl">
            Check what the run made from your chapter. Everything needs your accept before students can open it; a
            part you reject stops the chapter from being published until it is run again.
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </Button>
      </header>

      <div className="flex-1 px-5 md:px-7 py-5 flex flex-col gap-4">
        {loadError ? (
          <div className="py-10 flex flex-col items-center gap-4 text-center">
            <p role="alert" className="text-sm font-bold text-[#1A3D2C]/70 max-w-md">{loadError}</p>
            <Button variant="secondary" leadingIcon={<Play size={14} />} loading={busy === "rerun"} onClick={() => void rerun()}>
              Run the chapter again
            </Button>
          </div>
        ) : !data ? (
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-[#1A3D2C]/40 py-10">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Loading the review…
          </p>
        ) : (
          <>
            {published ? (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-800">
                <CheckCircle2 size={16} aria-hidden /> Published. Students of your school can open this chapter.
              </p>
            ) : blocked ? (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-bold text-amber-800">
                <AlertCircle size={16} aria-hidden /> Core&apos;s checks blocked this release. Run the chapter again, or ask GenEd to look at it.
              </p>
            ) : null}

            <div className="grid grid-cols-3 gap-2.5">
              <Count label="To review" value={pending.length} tone={pending.length ? "warn" : "neutral"} />
              <Count label="Accepted" value={accepted} tone="good" />
              <Count label="Rejected" value={rejected.length} tone={rejected.length ? "bad" : "neutral"} />
            </div>

            {groupByKind(proposals).map((g) => (
              <KindGroup
                key={g.kind}
                label={g.info.label}
                hint={g.info.hint}
                proposals={g.proposals}
                readOnly={published}
                busy={busy}
                onAcceptAll={(ps) => void decide(g.info.label, ps, "accept")}
                onDecide={(p, decision, reason) => void decide(p.id, [p], decision, reason)}
              />
            ))}
          </>
        )}
      </div>

      {data && !published && (
        <footer className="sticky bottom-0 shrink-0 bg-white border-t border-[#1A3D2C]/5 px-5 md:px-7 py-4 flex flex-col gap-3">
          {error && (
            <p role="alert" className="flex items-start gap-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="mt-px shrink-0" aria-hidden /> {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="flex-1 text-xs font-bold text-[#1A3D2C]/55">
              {rejected.length
                ? "A rejected part stops publishing. Run the chapter again to make a new release."
                : pending.length
                  ? `${pending.length} part${pending.length === 1 ? "" : "s"} left to review`
                  : "Everything is accepted."}
            </p>
            {pending.length > 0 && (
              <Button variant="secondary" leadingIcon={<Check size={14} />} loading={busy === "all"} disabled={!!busy}
                onClick={() => void decide("all", pending, "accept")}>
                Accept all {pending.length}
              </Button>
            )}
            {rejected.length > 0 ? (
              <Button leadingIcon={<Play size={14} />} loading={busy === "rerun"} disabled={!!busy && busy !== "rerun"} onClick={() => void rerun()}>
                Run the chapter again
              </Button>
            ) : (
              <Button leadingIcon={<Rocket size={14} />} loading={busy === "publish"} disabled={!canPublish || (!!busy && busy !== "publish")}
                onClick={() => void publish()}>
                Publish chapter
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" | "neutral" }) {
  const color = { good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700", neutral: "text-[#1A3D2C]" }[tone];
  return (
    <div className="rounded-2xl bg-white border border-[#1A3D2C]/5 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function KindGroup({
  label,
  hint,
  proposals,
  readOnly,
  busy,
  onAcceptAll,
  onDecide,
}: {
  label: string;
  hint: string;
  proposals: ReleaseProposal[];
  readOnly: boolean;
  busy: string | null;
  onAcceptAll: (ps: ReleaseProposal[]) => void;
  onDecide: (p: ReleaseProposal, decision: "accept" | "reject", reason?: ReleaseReason) => void;
}) {
  const pending = proposals.filter((p) => p.state === "pending");
  const [open, setOpen] = useState(pending.length > 0 && pending.length <= 12);
  return (
    <section aria-label={label} className="rounded-2xl bg-white border border-[#1A3D2C]/5">
      <div className="flex items-center gap-3 px-4 md:px-5 py-3.5">
        {/* eslint-disable-next-line no-restricted-syntax -- a full-width disclosure header, not an action button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          <ChevronDown size={16} className={`shrink-0 text-[#1A3D2C]/40 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-black text-[#1A3D2C]">
              {label} <span className="text-[#1A3D2C]/40 tabular-nums">· {proposals.length}</span>
            </span>
            {hint && <span className="block text-[11px] text-[#1A3D2C]/50 truncate">{hint}</span>}
          </span>
        </button>
        {pending.length > 0 ? (
          !readOnly && (
            <Button size="sm" variant="tertiary" leadingIcon={<Check size={13} />} loading={busy === label} disabled={!!busy}
              onClick={() => onAcceptAll(pending)} aria-label={`Accept all ${pending.length} ${label.toLowerCase()}`}>
              Accept {pending.length}
            </Button>
          )
        ) : (
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Done</span>
        )}
      </div>
      {open && (
        <ul className="border-t border-[#1A3D2C]/5 divide-y divide-[#1A3D2C]/5">
          {proposals.map((p) => (
            <ProposalRow key={p.id} proposal={p} readOnly={readOnly} busy={busy} onDecide={onDecide} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProposalRow({
  proposal,
  readOnly,
  busy,
  onDecide,
}: {
  proposal: ReleaseProposal;
  readOnly: boolean;
  busy: string | null;
  onDecide: (p: ReleaseProposal, decision: "accept" | "reject", reason?: ReleaseReason) => void;
}) {
  const { title, detail } = summarize(proposal);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<ReleaseReason | "">("");
  const [showDetails, setShowDetails] = useState(false);
  const mine = busy === proposal.id;

  return (
    <li className="px-4 md:px-5 py-3.5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A3D2C] leading-snug">{title}</p>
          {detail && <p className="mt-0.5 text-xs text-[#1A3D2C]/60 leading-relaxed line-clamp-3">{detail}</p>}
          {/* eslint-disable-next-line no-restricted-syntax -- an inline text disclosure, not an action button */}
          <button type="button" onClick={() => setShowDetails((s) => !s)} className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/35 hover:text-[#1A3D2C]/60">
            {showDetails ? "Hide details" : "Details"}
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#F8F9F8] p-3 text-[11px] leading-relaxed text-[#1A3D2C]/80 whitespace-pre-wrap break-words">
              {detailsOf(proposal)}
            </pre>
          )}
        </div>
        {proposal.state !== "pending" ? (
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
              proposal.state === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {proposal.state === "accepted" ? "Accepted" : "Rejected"}
          </span>
        ) : (
          !readOnly &&
          !rejecting && (
            <div className="shrink-0 flex items-center gap-1.5">
              <Button size="sm" variant="tertiary" disabled={!!busy} onClick={() => setRejecting(true)} aria-label={`Reject ${title}`}>
                Reject
              </Button>
              <Button size="sm" leadingIcon={<Check size={13} />} loading={mine} disabled={!!busy && !mine}
                onClick={() => onDecide(proposal, "accept")} aria-label={`Accept ${title}`}>
                Accept
              </Button>
            </div>
          )
        )}
      </div>
      {rejecting && proposal.state === "pending" && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-red-50/60 border border-red-100 p-3">
          <label className="flex-1 flex items-center gap-2 text-xs font-bold text-[#1A3D2C]/70">
            Why?
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReleaseReason)}
              aria-label="Reason for rejecting"
              className="flex-1 rounded-lg border border-[#1A3D2C]/10 bg-white px-2 py-1.5 text-xs font-bold text-[#1A3D2C]"
            >
              <option value="">Pick a reason…</option>
              {REJECT_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="tertiary" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructiveSolid" disabled={!reason || !!busy} loading={mine}
              onClick={() => onDecide(proposal, "reject", reason as ReleaseReason)}>
              Reject
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
