"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MomentArt } from "@/components/shared/MomentArt";
import { STUDENT_COLORS as C } from "../theme/colors";
import { STREAK_RECORD_ART, STREAK_UP_ART } from "../theme/momentArt";

export interface StreakSeen {
  current: number;
  longest: number;
}

export type StreakMoment = { kind: "up" | "record"; days: number } | null;

/**
 * What, if anything, to celebrate, given the streak this device last showed (`seen`) and the one just loaded.
 *
 * - No record yet (a first visit on this device): nothing; the caller just remembers today's numbers.
 * - The streak grew to 2 days or more: "up", a new link on the chain. Day 1 is a start, not a run.
 * - ...and it also beat the longest run this device had seen: "record", the trophy.
 * - Same, lower (a broken streak) or unknown: nothing.
 */
export function streakMoment(seen: StreakSeen | null, now: StreakSeen): StreakMoment {
  if (!seen || now.current < 2 || now.current <= seen.current) return null;
  const record = now.current >= now.longest && now.current > seen.longest;
  return { kind: record ? "record" : "up", days: now.current };
}

const KEY = (userId: string) => `zoovi_streak_seen:${userId}`;

function readSeen(userId: string): StreakSeen | null {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StreakSeen>;
    return typeof v.current === "number" && typeof v.longest === "number" ? { current: v.current, longest: v.longest } : null;
  } catch {
    return null;
  }
}

function writeSeen(userId: string, seen: StreakSeen) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(seen));
  } catch {
    // Private mode or storage off: the celebration may repeat, nothing worse.
  }
}

/**
 * The home page's streak moment: once, when the student comes back with a longer streak than this device last showed.
 * A paper chain snapping on a new lime link, or, for a new longest run, the trophy tying on its lime ribbon.
 *
 * `held` keeps it back while another moment has the screen (the first-run "You're all set"); it shows after.
 */
export function StreakCelebration({
  userId,
  stats,
  held = false,
}: {
  userId: string | undefined;
  stats: { currentStreak: number; longestStreak: number } | null;
  held?: boolean;
}) {
  const [moment, setMoment] = useState<StreakMoment>(null);

  useEffect(() => {
    if (!userId || !stats || held) return;
    const now = { current: stats.currentStreak, longest: stats.longestStreak };
    const found = streakMoment(readSeen(userId), now);
    // Remember straight away, so a reload or a second tab doesn't celebrate the same day twice.
    writeSeen(userId, now);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the moment comes from storage (outside React), read once the stats load
    if (found) setMoment(found);
  }, [userId, stats, held]);

  const close = () => setMoment(null);
  const record = moment?.kind === "record";

  return (
    <Modal
      open={moment !== null}
      onClose={close}
      size="sm"
      title={record ? "Your best run yet" : `${moment?.days ?? ""} days in a row`}
      panelStyle={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      {moment && (
        <>
          <div className="flex flex-col items-center text-center" style={{ padding: "26px 28px 18px" }}>
            {/* Streak up: a new lime link snaps onto the chain. A new record: the trophy ties on its lime ribbon. */}
            <MomentArt art={record ? STREAK_RECORD_ART : STREAK_UP_ART} width={record ? 170 : 200} shadow={false} className="mb-1" />
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: C.accentDeep }}>
              {record ? "New longest streak" : "Streak"}
            </p>
            {/* Visual only: Modal's `title` is the dialog's accessible name. */}
            <p aria-hidden="true" className="m-0 mt-1 font-extrabold" style={{ color: C.text, fontFamily: "var(--font-display)", fontSize: 24 }}>
              {record ? "Your best run yet!" : `${moment.days} days in a row!`}
            </p>
            <p className="mt-2 mb-0 max-w-[290px]" style={{ color: C.textMid, fontSize: 14, lineHeight: 1.55 }}>
              {record
                ? `${moment.days} days in a row, your longest streak so far. Keep it going!`
                : "You've learned every day. Come back tomorrow to add another link."}
            </p>
          </div>
          <div style={{ padding: "0 28px 26px" }}>
            <Button variant="primary" fullWidth onClick={close}>
              Keep going
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
