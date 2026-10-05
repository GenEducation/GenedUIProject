"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

// ─────────────────────────────────────────────────────────
// SHARED HELPERS — collapse to plain markup in print variant
// ─────────────────────────────────────────────────────────

export function Reveal({ open, print, children }: { open: boolean; print: boolean; children: React.ReactNode }) {
  if (print) return open ? <div>{children}</div> : null;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Chevron({ open, print }: { open: boolean; print: boolean }) {
  if (print) return <ChevronDown size={18} style={{ color: "var(--muted)" }} />;
  return (
    <motion.span
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", color: "var(--muted)" }}
    >
      <ChevronDown size={18} />
    </motion.span>
  );
}
