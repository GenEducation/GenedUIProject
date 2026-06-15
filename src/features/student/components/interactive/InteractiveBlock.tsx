"use client";

import React from "react";
import type { InteractiveProps } from "./types";
import { COMPONENT_REGISTRY } from "./registry";

function Fallback({ label }: { label?: string }) {
  return (
    <div
      className="my-2 self-center"
      style={{
        background: "#FFF8E1", color: "#F57F17", padding: "8px 14px",
        borderRadius: 12, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
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

  return <Comp directiveId={directiveId} meta={meta} disabled={disabled} readOnly={readOnly} />;
}

export default InteractiveBlock;
