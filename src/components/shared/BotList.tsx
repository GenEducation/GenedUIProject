"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RelativeTime } from "@/components/shared/RelativeTime";
import type { PairedBot } from "@/features/student/services/botService";

const DAY = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

function onDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DAY.format(d);
}

/** Colours per surface: the student profile and the parent portal each use their own tokens. */
export interface BotListTheme {
  row: string;
  ink: string;
  soft: string;
  icon: string;
  danger: string;
}

/**
 * A student's paired GenEd bots, each with a two-step Remove. Removing one disconnects it within the hour; it then
 * shows "This bot was removed from GenEd" and a new pairing code.
 */
export function BotList({
  bots,
  theme,
  onRemove,
  emptyText,
}: {
  bots: PairedBot[];
  theme: BotListTheme;
  onRemove: (bot: PairedBot) => Promise<void>;
  emptyText: string;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  if (bots.length === 0) {
    return <p className={`text-[13px] ${theme.soft}`}>{emptyText}</p>;
  }

  const remove = async (bot: PairedBot) => {
    setRemoving(bot.id);
    setFailed(null);
    try {
      await onRemove(bot);
      setConfirming(null);
    } catch {
      setFailed(bot.id);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <ul aria-label="Paired GenEd bots" className="space-y-2">
      {bots.map((bot) => (
        <li key={bot.id} className={`rounded-2xl px-3.5 py-3 ${theme.row}`}>
          <div className="flex items-center gap-3">
            <span aria-hidden className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${theme.icon}`}>
              <Bot size={18} strokeWidth={2.1} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[14px] font-bold ${theme.ink}`}>{bot.label}</p>
              <p className={`mt-0.5 text-[12.5px] leading-snug ${theme.soft}`}>
                <RelativeTime value={bot.last_used_at} prefix="Last used " />
                {onDay(bot.disconnects_at) && <> · Needs a new code after {onDay(bot.disconnects_at)} if unused</>}
              </p>
            </div>
            {confirming !== bot.id && (
              <Button
                variant="tertiary"
                size="sm"
                aria-label={`Remove ${bot.label}`}
                onClick={() => { setConfirming(bot.id); setFailed(null); }}
                className={`shrink-0 ${theme.danger}`}
              >
                Remove
              </Button>
            )}
          </div>
          {confirming === bot.id && (
            <div role="group" aria-label={`Remove ${bot.label}?`} className="mt-3 flex flex-wrap items-center gap-2 sm:pl-12">
              <p className={`mr-auto text-[12.5px] font-semibold ${theme.ink}`}>
                Remove this bot? It will ask for a new pairing code.
              </p>
              <Button variant="outline" size="sm" onClick={() => setConfirming(null)} disabled={removing === bot.id}>
                Keep
              </Button>
              <Button
                variant="destructiveSolid"
                size="sm"
                onClick={() => void remove(bot)}
                disabled={removing === bot.id}
                leadingIcon={removing === bot.id ? <Loader2 size={14} className="animate-spin" /> : undefined}
              >
                Remove
              </Button>
            </div>
          )}
          {failed === bot.id && (
            <p role="alert" className={`mt-2 text-[12.5px] font-semibold sm:pl-12 ${theme.danger}`}>
              Couldn&apos;t remove it. Please try again.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
