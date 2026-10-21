"use client";

import React, { useId } from "react";
import { HandHeart, MessageCircle, PartyPopper } from "lucide-react";
import type { HelpTip } from "./insights";

/**
 * A short, practical "what can I do at home" note, written from the child's
 * weakest and strongest skill areas. Citron is the portal's highlight colour,
 * so this is the one card that stands out.
 */
export function HelpCard({ tips, childName }: { tips: HelpTip[]; childName: string }) {
  const titleId = useId();
  if (tips.length === 0) return null;
  return (
    <section
      aria-labelledby={titleId}
      className="relative overflow-hidden rounded-[24px] border border-[#DDEAB4] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_32px_-24px_rgba(19,41,61,0.35)]"
      style={{ background: "linear-gradient(160deg, #F1F9D4 0%, #FBFDF2 70%)" }}
    >
      <span aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#D9F279]/40 blur-[2px]" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#D9F279] text-[var(--pp-green)]">
          <HandHeart size={20} strokeWidth={2.3} />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5C7A12]">At home this week</p>
          <h2 id={titleId} className="text-[17px] font-extrabold leading-tight text-[var(--pp-ink)]">How you can help {childName}</h2>
        </div>
      </div>
      <ul className="relative mt-4 space-y-2.5">
        {tips.map((tip) => {
          const Icon = tip.kind === "praise" ? PartyPopper : MessageCircle;
          return (
            <li key={`${tip.kind}-${tip.area}`} className="flex gap-3 rounded-2xl bg-white/75 p-3 ring-1 ring-[#E6EFC6]">
              <Icon size={17} className="mt-0.5 shrink-0 text-[var(--pp-green)]" aria-hidden />
              <p className="text-[13.5px] leading-relaxed text-[var(--pp-ink)]">{tip.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
