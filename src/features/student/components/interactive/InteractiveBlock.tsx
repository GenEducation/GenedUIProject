"use client";

import React from "react";
import type { InteractiveProps } from "./types";
import { COMPONENT_REGISTRY } from "./registry";
import { InteractiveContext } from "./shared";

function Fallback({ label }: { label?: string }) {
  return (
    <div
      className="my-2 self-center"
      style={{
        background: "#FFF8E1", color: "#F57F17", padding: "8px 14px",
        borderRadius: 12, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body)",
      }}
    >
      🧩 Activity unavailable{label ? ` — ${label}` : ""}
    </div>
  );
}

/**
 * Dispatcher for interactive math blocks. Reads meta.interactive_type, looks up the
 * matching widget in COMPONENT_REGISTRY, and renders a graceful fallback for unknown
 * types or error blocks — so newer backends never crash an older client.
 */
export function InteractiveBlock({ directiveId, meta, disabled, readOnly }: InteractiveProps) {
  if (meta?.is_fallback || meta?.error) {
    return <Fallback label={meta?.label} />;
  }

  const type = meta?.interactive_type;
  const Comp = type ? COMPONENT_REGISTRY[type] : undefined;
  if (!Comp) return <Fallback label={meta?.label} />;

  // Render read-only (no Check button) when:
  //  - explicitly asked (readOnly prop), or
  //  - the block was rehydrated from history (meta.read_only) — it keeps its
  //    directive_id so the student's past result can still be looked up, or
  //  - there is no directive_id at all (a directive emitted as raw text), so it
  //    could never be graded.
  const effectiveReadOnly = !!readOnly || !!meta?.read_only || !meta?.directive_id;

  return (
    <InteractiveContext.Provider value={{ readOnly: effectiveReadOnly }}>
      <Comp
        directiveId={directiveId}
        meta={meta}
        disabled={disabled || effectiveReadOnly}
        readOnly={effectiveReadOnly}
      />
    </InteractiveContext.Provider>
  );
}

export default InteractiveBlock;
