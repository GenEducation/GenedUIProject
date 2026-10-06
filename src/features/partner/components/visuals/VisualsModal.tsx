"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Images, RotateCw, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Subject } from "../../store/usePartnerStore";
import type { CandidateState } from "../../types/visuals";
import type { VisualCounts } from "../../hooks/useVisualsIndex";
import { useVisualsList } from "../../hooks/useVisualsList";
import { VisualCard } from "./VisualCard";
import { VisualDetailPane } from "./VisualDetailPane";
import { Skeleton } from "../Skeleton";

interface VisualsModalProps {
  /** The registry row whose visuals to review; null keeps the popup closed. */
  subject: Subject | null;
  counts?: VisualCounts | null;
  onClose: () => void;
  /** A decision or new-version request landed: the registry refreshes its badges. */
  onChanged: () => void;
}

const TABS: { id: CandidateState; label: string; empty: string }[] = [
  { id: "pending", label: "To review", empty: "No visuals waiting for review." },
  { id: "accepted", label: "Accepted", empty: "No accepted visuals yet." },
  { id: "rejected", label: "Rejected", empty: "No rejected visuals." },
];

function initialTab(counts?: VisualCounts | null): CandidateState {
  if (!counts || counts.pending > 0) return "pending";
  return counts.accepted > 0 ? "accepted" : "rejected";
}

export function VisualsModal({ subject, counts, onClose, onChanged }: VisualsModalProps) {
  return (
    <Modal
      open={!!subject}
      onClose={onClose}
      size="full"
      title={subject ? `Visuals for ${subject.title}` : "Visuals"}
      panelStyle={{ maxWidth: "min(1180px, 100%)", background: "#F8F9F8" }}
    >
      {/* Keyed so each row opens on a fresh tab/selection. */}
      {subject && <VisualsModalBody key={subject.id} subject={subject} counts={counts} onClose={onClose} onChanged={onChanged} />}
    </Modal>
  );
}

function VisualsModalBody({ subject, counts, onClose, onChanged }: Required<Pick<VisualsModalProps, "onClose" | "onChanged">> & { subject: Subject; counts?: VisualCounts | null }) {
  const [tab, setTab] = useState<CandidateState>(() => initialTab(counts));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The pending list is always loaded: it drives "next" after a decision, whatever tab is showing.
  const pending = useVisualsList(subject.source_id, "pending");
  const other = useVisualsList(tab === "pending" ? null : subject.source_id, tab === "pending" ? "accepted" : tab);
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

  const handleDecided = (id: string) => {
    const next = nextPendingAfter(id);
    void pending.refresh();
    if (tab !== "pending") void other.refresh();
    onChanged();
    setSelectedId(next);
  };

  const refreshAll = () => {
    void pending.refresh();
    if (tab !== "pending") void other.refresh();
    onChanged();
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="shrink-0 flex items-start gap-4 px-5 md:px-7 pt-6 pb-4 bg-white border-b border-[#1A3D2C]/5">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#1A3D2C] text-white flex items-center justify-center">
          <Images size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40">Teaching visuals</p>
          <h2 className="text-lg md:text-xl font-black text-[#1A3D2C] tracking-tight truncate">{subject.title}</h2>
          <p className="text-[11px] font-bold text-[#1A3D2C]/50 uppercase tracking-wider truncate">
            {subject.book_title} · Ch {subject.chapter_ordinal} · Grade {subject.grade} · {subject.subject}
          </p>
        </div>
        <Button iconOnly variant="tertiary" aria-label="Refresh" onClick={refreshAll} disabled={list.loading}>
          <RotateCw size={16} className={list.loading ? "animate-spin" : ""} />
        </Button>
        <Button iconOnly variant="tertiary" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </Button>
      </header>

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
              onNext={goNext}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col gap-4 px-5 md:px-7 py-5"
          >
            {/* Tabs */}
            <div role="tablist" aria-label="Visual state" className="flex gap-1 p-1 bg-white rounded-2xl border border-[#1A3D2C]/5 self-start">
              {TABS.map((t) => {
                const active = t.id === tab;
                const n = counts?.[t.id];
                return (
                  // eslint-disable-next-line no-restricted-syntax -- segmented tab, styled as part of the tablist
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors ${
                      active ? "bg-[#1A3D2C] text-white" : "text-[#1A3D2C]/45 hover:text-[#1A3D2C] hover:bg-[#1A3D2C]/5"
                    }`}
                  >
                    {t.label}
                    {n ? <span className={`ml-1.5 tabular-nums ${active ? "text-white/60" : "text-[#1A3D2C]/30"}`}>{n}</span> : null}
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" aria-label={activeTab.label} className="flex-1">
              {list.error && !list.items.length ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm font-bold text-[#1A3D2C]">{list.error}</p>
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
      <div className="h-14 w-14 rounded-2xl bg-white border border-[#1A3D2C]/5 flex items-center justify-center text-[#1A3D2C]/25">
        <Images size={24} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-bold text-[#1A3D2C]/60">{text}</p>
    </div>
  );
}
