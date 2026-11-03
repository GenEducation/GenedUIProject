"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RedrawItem, RedrawState } from "../../types/visuals";
import { REDRAW_STATE_LABEL, redrawFailureText } from "../../utils/redrawTally";
import { VisualImage } from "./VisualImage";

interface RedrawListProps {
  items: RedrawItem[];
  /** Open a visual in the detail pane: the new version, or the rejected one (to retry a failed redraw). */
  onOpen: (candidateId: string) => void;
  onImageExpired: () => void;
}

/** What needs the partner first: new versions to review, then work still going, then what failed, then the done. */
const ORDER: RedrawState[] = ["ready", "drawing", "queued", "failed", "reviewed"];

const CHIP: Record<RedrawState, { cls: string; icon: React.ReactNode }> = {
  ready: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Sparkles size={10} aria-hidden /> },
  drawing: { cls: "bg-[#DCEBE7] text-[#075E63] border-[#075E63]/15", icon: <Loader2 size={10} className="animate-spin" aria-hidden /> },
  queued: { cls: "bg-[#122D30]/[0.04] text-[#122D30]/60 border-[#122D30]/10", icon: <Clock size={10} aria-hidden /> },
  failed: { cls: "bg-red-50 text-red-700 border-red-200", icon: <AlertCircle size={10} aria-hidden /> },
  reviewed: { cls: "bg-white text-[#122D30]/50 border-[#122D30]/10", icon: <CheckCircle2 size={10} aria-hidden /> },
};

function since(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

/**
 * Every redraw the partner sent back for this chapter, so nothing has to be
 * remembered: what is still drawing, what is ready to review (one click opens
 * the new version), and what failed (opens the rejected visual, whose panel
 * offers "Try again").
 */
export function RedrawList({ items, onOpen, onImageExpired }: RedrawListProps) {
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state));

  return (
    <ul className="flex flex-col gap-2" aria-label="Redraws">
      {sorted.map((item, i) => {
        const chip = CHIP[item.state];
        const newVersion = item.result_candidate_id;
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.025 }}
            className={`flex items-center gap-3 sm:gap-4 rounded-2xl bg-white border px-3 py-2.5 ${
              item.state === "ready" ? "border-emerald-200 shadow-[0_6px_20px_rgba(16,185,129,0.08)]" : "border-[#122D30]/5"
            }`}
          >
            <div className="w-16 sm:w-20 shrink-0 rounded-xl overflow-hidden border border-[#122D30]/5 opacity-80">
              <VisualImage imageUrl={item.image_url} alt={`Rejected: ${item.title}`} onExpired={onImageExpired} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${chip.cls}`}>
                  {chip.icon}
                  {REDRAW_STATE_LABEL[item.state]}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#122D30]/35">
                  {item.kind === "figure" ? "Figure" : item.kind === "card" ? "Chapter card" : "Lesson step"}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#122D30] leading-snug truncate">{item.title}</p>
              <p className="text-[11px] font-bold text-[#122D30]/45 tabular-nums">
                Sent {since(item.requested_at)}
                {item.attempts > 1 ? ` · attempt ${item.attempts}` : ""}
                {item.finished_at && item.state !== "failed" ? ` · drawn ${since(item.finished_at)}` : ""}
              </p>
              {item.state === "failed" && (
                <p className="mt-1 text-[11px] font-bold text-red-700">{redrawFailureText(item.failure)}</p>
              )}
            </div>
            <div className="shrink-0">
              {item.state === "ready" && newVersion ? (
                <Button size="sm" trailingIcon={<ArrowRight size={13} />} onClick={() => onOpen(newVersion)}>
                  Review
                </Button>
              ) : item.state === "reviewed" && newVersion ? (
                <Button size="sm" variant="tertiary" onClick={() => onOpen(newVersion)}>
                  Open
                </Button>
              ) : item.state === "failed" ? (
                <Button size="sm" variant="outline" leadingIcon={<RefreshCcw size={13} />} onClick={() => onOpen(item.candidate_id)}>
                  Try again
                </Button>
              ) : (
                <Button size="sm" variant="tertiary" onClick={() => onOpen(item.candidate_id)}>
                  Open
                </Button>
              )}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
