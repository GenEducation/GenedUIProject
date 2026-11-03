"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Images, RotateCw, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Subject } from "../../store/usePartnerStore";
import type { CandidateState, VisualDecisionOut, VisualReviewSummary } from "../../types/visuals";
import type { VisualCounts } from "../../hooks/useVisualsIndex";
import { useVisualsList } from "../../hooks/useVisualsList";
import { useRedrawList } from "../../hooks/useRedrawList";
import { VisualCard } from "./VisualCard";
import { RedrawList } from "./RedrawList";
import { RedrawTallyBar } from "./RedrawTallyBar";
import { VisualDetailPane } from "./VisualDetailPane";
import { Skeleton } from "../Skeleton";

interface VisualsModalProps {
  /** The registry row whose visuals to review; null keeps the popup closed. */
  subject: Subject | null;
  counts?: VisualCounts | null;
  /** The chapter's review tally (pictures and redraws); the bar is hidden without it. */
  summary?: VisualReviewSummary | null;
  /** Open on this tab (the "all redraws ready" notice opens on "redraws"). */
  initialTab?: Tab | null;
  onClose: () => void;
  /** A decision or new-version request landed: the registry refreshes its badges. */
  onChanged: () => void;
}

export type Tab = CandidateState | "redraws";

const TABS: { id: Tab; label: string; empty: string }[] = [
  { id: "pending", label: "To review", empty: "No visuals waiting for review." },
  { id: "accepted", label: "Accepted", empty: "No accepted visuals yet." },
  { id: "rejected", label: "Rejected", empty: "No rejected visuals." },
  { id: "redraws", label: "Redraws", empty: "No redraws asked for. Reject a visual with “Make a new version” on to ask for one." },
];

function initialTab(counts?: VisualCounts | null, wanted?: Tab | null): Tab {
  if (wanted) return wanted;
  if (!counts || counts.pending > 0) return "pending";
  return counts.accepted > 0 ? "accepted" : "rejected";
}

export function VisualsModal({ subject, counts, summary, initialTab: wanted, onClose, onChanged }: VisualsModalProps) {
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Visuals for ${subject.title}` : "Visuals"}
      panelStyle={{ maxWidth: "min(1180px, 100%)", background: "#F6F7F2" }}
    >
      {/* Keyed so each row opens on a fresh tab/selection. */}
      {subject && (
        <VisualsModalBody
          key={subject.id}
          subject={subject}
          counts={counts}
          summary={summary}
          wanted={wanted}
          onClose={onClose}
          onChanged={onChanged}
        />
      )}
    </Modal>
  );
}

function VisualsModalBody({
  subject,
  counts,
  summary,
  wanted,
  onClose,
  onChanged,
}: Required<Pick<VisualsModalProps, "onClose" | "onChanged">> & {
  subject: Subject;
  counts?: VisualCounts | null;
  summary?: VisualReviewSummary | null;
  wanted?: Tab | null;
}) {
  const [tab, setTab] = useState<Tab>(() => initialTab(counts, wanted));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Said once a reject asked for a redraw: the review moves on to the next visual, so the request would go unseen.
  const [notice, setNotice] = useState<string | null>(null);
  const redraws = useRedrawList(subject.source_id);

  // The pending list is always loaded: it drives "next" after a decision, whatever tab is showing.
  const pending = useVisualsList(subject.source_id, "pending");
  const listed: CandidateState = tab === "pending" || tab === "redraws" ? "accepted" : tab;
  const other = useVisualsList(tab === "pending" || tab === "redraws" ? null : subject.source_id, listed);
  const list = tab === "pending" ? pending : other;
  const activeTab = TABS.find((t) => t.id === tab)!;

  const nextPendingAfter = useCallback(
    (id: string | null): string | null => {
      const rest = pending.items.filter((v) => v.id !== id);
      if (!rest.length) return null;
      const idx = pending.items.findIndex((v) => v.id === id);
      return (idx === -1 ? rest[0] : rest[idx] ?? rest[0]).id;
    },
    [pending.items],
  );

  const nextId = selectedId ? nextPendingAfter(selectedId) : null;
  const goNext = useMemo(() => (nextId ? () => setSelectedId(nextId) : null), [nextId]);

  const handleDecided = (id: string, result?: VisualDecisionOut) => {
    const next = nextPendingAfter(id);
    void pending.refresh();
    if (tab !== "pending" && tab !== "redraws") void other.refresh();
    void redraws.refresh();
    onChanged();
    setNotice(result?.regeneration_id ? "Sent for a redraw. Follow it under Redraws; it keeps going if you close this." : null);
    setSelectedId(next);
  };

  const refreshAll = () => {
    void pending.refresh();
    if (tab !== "pending" && tab !== "redraws") void other.refresh();
    void redraws.refresh();
    onChanged();
  };

  const showRedraws = () => {
    setSelectedId(null);
    setTab("redraws");
  };
  const tabCount = (id: Tab): number | undefined =>
    id === "redraws" ? (summary?.redraws.open ?? redraws.items.length) || undefined : counts?.[id];
  const loading = tab === "redraws" ? redraws.loading : list.loading;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="shrink-0 flex items-start gap-3 sm:gap-4 px-4 sm:px-5 md:px-7 pt-5 sm:pt-6 pb-4 bg-white border-b border-[#122D30]/5">
        <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl bg-[#075E63] text-white flex items-center justify-center">
          <Images size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#122D30]/40">Teaching visuals</p>
          <h2 className="text-lg md:text-xl font-black text-[#122D30] tracking-tight truncate">{subject.title}</h2>
          <p className="text-[11px] font-bold text-[#122D30]/50 uppercase tracking-wider line-clamp-2 sm:truncate">
            {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade} · {subject.subject}
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Refresh" onClick={refreshAll} disabled={loading}>
          <RotateCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </Button>
      </header>

      {notice && (
        <p
          role="status"
          className="mx-4 sm:mx-5 md:mx-7 mt-4 flex items-center gap-2 rounded-xl bg-[#DCEBE7] border border-[#075E63]/15 px-3 py-2 text-xs font-bold text-[#075E63]"
        >
          <CheckCircle2 size={14} className="shrink-0" aria-hidden />
          <span className="flex-1">{notice}</span>
          <Button size="sm" variant="tertiary" onClick={showRedraws}>
            Show redraws
          </Button>
          <Button iconOnly size="sm" variant="tertiary" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <X size={13} />
          </Button>
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {selectedId ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 bg-white"
          >
            <VisualDetailPane
              key={selectedId}
              id={selectedId}
              onBack={() => {
                setSelectedId(null);
                refreshAll();
              }}
              onOpen={setSelectedId}
              onDecided={handleDecided}
              onRecropped={(newId) => {
                refreshAll();
                setSelectedId(newId);
              }}
              onNext={goNext}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col gap-4 px-4 sm:px-5 md:px-7 py-5"
          >
            {summary && <RedrawTallyBar summary={summary} onShowRedraws={tab === "redraws" ? undefined : showRedraws} />}

            {/* Tabs */}
            {/* Equal segments across a phone's width; their natural size, to the left, when there is room. */}
            <div role="tablist" aria-label="Visual state" className="flex w-full gap-1 p-1 bg-white rounded-2xl border border-[#122D30]/5 sm:w-auto sm:self-start">
              {TABS.map((t) => {
                const active = t.id === tab;
                const n = tabCount(t.id);
                return (
                  // eslint-disable-next-line no-restricted-syntax -- segmented tab, styled as part of the tablist
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 sm:flex-none whitespace-nowrap px-2 sm:px-3.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest transition-colors ${
                      active ? "bg-[#075E63] text-white" : "text-[#122D30]/45 hover:text-[#122D30] hover:bg-[#075E63]/5"
                    }`}
                  >
                    {t.label}
                    {n ? <span className={`ml-1.5 tabular-nums ${active ? "text-white/60" : "text-[#122D30]/30"}`}>{n}</span> : null}
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" aria-label={activeTab.label} className="flex-1">
              {tab === "redraws" ? (
                redraws.error && !redraws.items.length ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <p className="text-sm font-bold text-[#122D30]">{redraws.error}</p>
                    <Button variant="outline" onClick={() => void redraws.refresh()}>
                      Try again
                    </Button>
                  </div>
                ) : redraws.loading && !redraws.items.length ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : !redraws.items.length ? (
                  <EmptyState text={activeTab.empty} />
                ) : (
                  <RedrawList items={redraws.items} onOpen={setSelectedId} onImageExpired={() => void redraws.refresh()} />
                )
              ) : list.error && !list.items.length ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm font-bold text-[#122D30]">{list.error}</p>
                  <Button variant="outline" onClick={() => void list.refresh()}>
                    Try again
                  </Button>
                </div>
              ) : list.loading && !list.items.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden">
                      <Skeleton className="aspect-[4/3] w-full rounded-none" />
                      <div className="p-4 flex flex-col gap-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !list.items.length ? (
                <EmptyState text={activeTab.empty} />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.items.map((visual, i) => (
                      <VisualCard
                        key={visual.id}
                        visual={visual}
                        index={i}
                        onOpen={setSelectedId}
                        onImageExpired={() => void list.refresh()}
                      />
                    ))}
                  </div>
                  {list.hasMore && (
                    <div className="flex justify-center pt-5">
                      <Button variant="outline" loading={list.loading} onClick={() => void list.loadMore()}>
                        Load more
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="h-14 w-14 rounded-2xl bg-white border border-[#122D30]/5 flex items-center justify-center text-[#122D30]/25">
        <Images size={24} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-bold text-[#122D30]/60">{text}</p>
    </div>
  );
}
