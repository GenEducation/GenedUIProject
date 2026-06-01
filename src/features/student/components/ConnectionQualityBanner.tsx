"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, Loader2 } from "lucide-react";

interface ConnectionQualityBannerProps {
  quality: "good" | "poor" | "reconnecting" | null;
}

export function ConnectionQualityBanner({ quality }: ConnectionQualityBannerProps) {
  const visible = quality === "poor" || quality === "reconnecting";

  const config = quality === "reconnecting"
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
