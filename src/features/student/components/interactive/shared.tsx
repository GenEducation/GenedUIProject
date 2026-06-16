"use client";

import React, { useMemo, useContext, createContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RefreshCw } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { COLORS, FONT } from "./types";

// Set by InteractiveBlock. readOnly = true when the block can't be submitted
// (history, or a directive with no directive_id) → the Check button is hidden.
export const InteractiveContext = createContext<{ readOnly?: boolean }>({});

// ── KaTeX inline label ────────────────────────────────────────────────────────
export function Katex({ tex, style }: { tex: string; style?: React.CSSProperties }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { throwOnError: false });
    } catch {
      return tex;
    }
  }, [tex]);
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Outer panel + prompt ──────────────────────────────────────────────────────
export function InteractiveShell({
  label,
  prompt,
  targetLabel,
  children,
}: {
  label?: string;
  prompt?: string;
  targetLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: 12,
        padding: 16,
        borderRadius: 20,
        background: COLORS.panel,
        border: "1px solid #5B4DC722",
        maxWidth: 680,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.brand, flexShrink: 0 }} />
        <span
          style={{
            fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
            textTransform: "uppercase", color: COLORS.brand, fontFamily: FONT,
          }}
        >
          {label || "Activity"}
        </span>
      </div>

      {prompt && (
        <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink, lineHeight: 1.5, marginBottom: 14, fontFamily: FONT, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>{prompt}</span>
          {targetLabel && <Katex tex={targetLabel} style={{ fontSize: 18 }} />}
        </p>
      )}

      {children}
    </motion.div>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────
export function SubmitButton({
  onClick,
  disabled,
  submitting,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  submitting?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || submitting}
      style={{
        marginTop: 14, padding: "10px 22px", borderRadius: 14, fontSize: 14, fontWeight: 700,
        border: "none", cursor: disabled || submitting ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1, transition: "all 0.18s", fontFamily: FONT,
        background: COLORS.brand, color: "#FFFFFF",
      }}
    >
      {submitting ? "Checking…" : children || "Check"}
    </button>
  );
}

// ── Result banner (+ retry) ───────────────────────────────────────────────────
export function ResultBanner({
  isCorrect,
  allowRetry,
  attempts,
  onRetry,
}: {
  isCorrect?: boolean;
  allowRetry?: boolean;
  attempts?: number;
  onRetry?: () => void;
}) {
  const canRetry = allowRetry && !isCorrect && (attempts ?? 0) < 3;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 700, fontFamily: FONT,
            color: isCorrect ? COLORS.success : COLORS.danger,
          }}
        >
          {isCorrect ? (
            <><Check size={14} style={{ strokeWidth: 3 }} /> Brilliant! That&apos;s correct.</>
          ) : (
            <>Not quite — give it another look!</>
          )}
        </div>
        {canRetry && (
          <button
            onClick={onRetry}
            style={{
              display: "flex", alignItems: "center", gap: 5, marginTop: 8,
              fontSize: 12, fontWeight: 700, color: COLORS.muted, background: "none",
              border: "none", cursor: "pointer", fontFamily: FONT,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = COLORS.brand)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = COLORS.muted)}
          >
            <RefreshCw size={11} /> Try again
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Footer: switches between Submit and Result based on submission state ───────
export function InteractiveFooter({
  submitted,
  canSubmit,
  submitting,
  onSubmit,
  isCorrect,
  allowRetry,
  attempts,
  onRetry,
  submitLabel,
}: {
  submitted: boolean;
  canSubmit: boolean;
  submitting?: boolean;
  onSubmit: () => void;
  isCorrect?: boolean;
  allowRetry?: boolean;
  attempts?: number;
  onRetry?: () => void;
  submitLabel?: string;
}) {
  const { readOnly } = useContext(InteractiveContext);
  if (readOnly) {
    // History / no directive_id: never offer Check or retry. Only surface a result
    // if one happens to be cached.
    return submitted ? <ResultBanner isCorrect={isCorrect} allowRetry={false} attempts={attempts} /> : null;
  }
  if (submitted) {
    return <ResultBanner isCorrect={isCorrect} allowRetry={allowRetry} attempts={attempts} onRetry={onRetry} />;
  }
  return <SubmitButton onClick={onSubmit} disabled={!canSubmit} submitting={submitting}>{submitLabel}</SubmitButton>;
}
