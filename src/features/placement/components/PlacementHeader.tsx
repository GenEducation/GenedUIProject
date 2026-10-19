"use client";

import { ClipboardList } from "lucide-react";

/**
 * The icon + title + subtitle every placement screen (intro, in-progress,
 * complete) shares. Factored out rather than left duplicated once a third
 * screen needed it. The icon is lucide-sourced deliberately — it isn't part
 * of the vendored `public/placement/icons/` asset pack, which only covers
 * subject icons, illustrations, and metric/step glyphs.
 */
export function PlacementHeader() {
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-2xl"
        style={{ background: "var(--pl-primary-soft)", color: "var(--pl-primary)" }}
        aria-hidden="true"
      >
        <ClipboardList size={22} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <h2 className="m-0 text-[17px] font-extrabold" style={{ color: "var(--pl-ink)" }}>
          Onboarding Test
        </h2>
        <p className="m-0 text-[12px] leading-snug" style={{ color: "var(--pl-ink-mid)" }}>
          This short test helps us understand what you already know. It includes
          questions from all your subjects.
        </p>
      </div>
    </div>
  );
}
