"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { BotList, type BotListTheme } from "@/components/shared/BotList";
import { listChildBots, removeChildBot, type PairedBot } from "@/features/student/services/botService";
import type { LinkedStudent } from "../../services/parentService";
import { childName } from "./linkParts";
import { GLASS } from "../home/theme";

const THEME: BotListTheme = {
  row: "border border-white/90 bg-white/65",
  ink: "text-[var(--pp-ink)]",
  soft: "text-[var(--pp-ink-soft)]",
  icon: "bg-[var(--pp-mint)] text-[var(--pp-green)]",
  danger: "text-[#C02659]",
};

/**
 * Each connected child's GenEd bots (backend ADR 0043), so a parent can disconnect one: a lost or passed-on bot, or
 * one the child shouldn't be using. Children whose list can't be loaded are left out rather than shown as empty.
 */
export function ChildBotsSection({ students }: { students: LinkedStudent[] }) {
  const [bots, setBots] = useState<Record<string, PairedBot[]>>({});
  const key = students.map((s) => s.student_id).join(",");

  useEffect(() => {
    if (!key) return;
    let live = true;
    key.split(",").forEach((id) => {
      listChildBots(id)
        .then((list) => { if (live) setBots((prev) => ({ ...prev, [id]: list })); })
        .catch(() => {});
    });
    return () => { live = false; };
  }, [key]);

  const loaded = students.filter((s) => bots[s.student_id] !== undefined);
  if (loaded.length === 0) return null;

  return (
    <section aria-labelledby="bots-title" className={`rounded-[24px] p-5 sm:p-6 ${GLASS}`}>
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--pp-mint)] text-[var(--pp-green)]">
          <Bot size={19} strokeWidth={2.2} />
        </span>
        <div>
          <h2 id="bots-title" className="text-[18px] font-extrabold text-[var(--pp-ink)]">GenEd bots</h2>
          <p className="text-[13px] text-[var(--pp-ink-soft)]">A removed bot disconnects within the hour and asks for a new code.</p>
        </div>
      </header>
      <div className="mt-5 space-y-5">
        {loaded.map((s) => (
          <div key={s.student_id}>
            <h3 className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[var(--pp-ink-soft)]">{childName(s)}</h3>
            <BotList
              bots={bots[s.student_id]}
              theme={THEME}
              emptyText="No bot paired."
              onRemove={async (bot) => {
                await removeChildBot(s.student_id, bot.id);
                setBots((prev) => ({ ...prev, [s.student_id]: prev[s.student_id].filter((b) => b.id !== bot.id) }));
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
