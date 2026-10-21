"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, Loader2, CheckCircle2 } from "lucide-react";
import { STUDENT_COLORS } from "../theme/colors";

interface ConnectionQualityBannerProps {
  quality: "good" | "poor" | "reconnecting" | null;
  /**
   * Backend-authored line, in the backend's own child-facing words. Takes precedence
   * over `quality` and is never styled as a fault — nothing is broken when it shows.
   * `kind: "rotating"` is in-progress (socket rotation, approaching cap);
   * `kind: "ended"` means the lesson closed deliberately and nothing is coming back.
   */
  notice?: { message: string; kind: "rotating" | "ended" } | null;
}

export function ConnectionQualityBanner({ quality, notice }: ConnectionQualityBannerProps) {
  const visible = !!notice || quality === "poor" || quality === "reconnecting";

  const config = notice
    ? notice.kind === "ended"
      ? {
          // Settled and celebratory, and no spinner: the lesson is complete, not
          // pending. A spinner here would tell the child to wait for something that
          // is not coming. A pale soft-surface wash with deep-ocean text — a step
          // lighter than the rotating notice so the two stay distinguishable.
          bg: "#EEF5F3",
          border: `${STUDENT_COLORS.tutor}40`,
          color: STUDENT_COLORS.tutor,
          icon: <CheckCircle2 size={14} style={{ color: STUDENT_COLORS.tutor }} />,
          text: notice.message,
        }
      : {
          // Tutor deep-ocean on the soft surface, not warning-red. A rotation the child
          // never asked about should not look like the connection dropping — it reads
          // as "Aanya is doing something", which is what it is.
          bg: STUDENT_COLORS.softSurface,
          border: `${STUDENT_COLORS.tutor}33`,
          color: STUDENT_COLORS.tutor,
          icon: <Loader2 size={14} className="animate-spin" />,
          text: notice.message,
        }
    : quality === "reconnecting"
    ? {
        bg: "#FEE2E2",
        border: "#FCA5A5",
        color: "#991B1B",
        icon: <Loader2 size={14} className="animate-spin" />,
        text: "Reconnecting…",
      }
    : {
        bg: "#FEF3C7",
        border: "#FCD34D",
        color: "#92400E",
        icon: <WifiOff size={14} />,
        text: "Poor internet connection",
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          <div
            className="flex items-center justify-center gap-2 py-2 px-4 text-[12px] font-semibold"
            style={{
              background: config.bg,
              borderBottom: `1px solid ${config.border}`,
              color: config.color,
            }}
          >
            {config.icon}
            {config.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
