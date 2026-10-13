"use client";

import React, { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BAND_TONES } from "@/components/report-card/subjectVisuals";
import { bandOf, type Mover, type TrendPoint } from "./insights";
import { BandTrack } from "./BandTrack";
import { DeltaPill } from "./parts";

const INITIAL = 6;

/** Small multiples: one card per skill, each with its own sparkline. */
export function MoversGrid({ movers }: { movers: Mover[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? movers : movers.slice(0, INITIAL);
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((m) => <MoverCard key={m.id} mover={m} />)}
      </ul>
      {movers.length > INITIAL && (
        <Button variant="secondary" size="sm" className="mt-3.5" aria-expanded={all} onClick={() => setAll((a) => !a)}>
          {all ? "Show fewer" : `Show all ${movers.length} skills`}
        </Button>
      )}
    </>
  );
}

function MoverCard({ mover }: { mover: Mover }) {
  const tone = BAND_TONES[bandOf(mover.latest)];
  const single = mover.points.length === 1;
  return (
    <li className="flex flex-col rounded-2xl border border-white/90 bg-white/65 p-4 transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-22px_rgba(19,41,61,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 min-h-[2.5em] text-[13.5px] font-bold leading-[1.25] text-[var(--pp-ink)]" title={mover.name}>
          {mover.name}
        </p>
        {single ? (
          <span className="shrink-0 rounded-full bg-[var(--pp-mint)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--pp-green-deep)]">New</span>
        ) : (
          <DeltaPill delta={mover.delta} />
        )}
      </div>
      {single ? (
        // Nothing to draw a line through yet: show where it sits on the scale.
        <div className="mt-auto pb-1 pt-5"><BandTrack score={mover.latest} size="sm" label={`${mover.name}: ${mover.latest} out of 100`} /></div>
      ) : (
        <Sparkline points={mover.points} color={tone.accent} />
      )}
      <p className="mt-1 flex items-baseline gap-1.5 text-[12px] text-[var(--pp-ink-soft)]">
        {single ? (
          <>First check <span className="text-[15px] font-extrabold tabular-nums" style={{ color: tone.ink }}>{mover.latest}</span></>
        ) : (
          <>
            <span className="tabular-nums">{mover.first}</span>
            <span aria-hidden>→</span>
            <span className="text-[15px] font-extrabold tabular-nums" style={{ color: tone.ink }}>{mover.latest}</span>
            <span className="ml-auto">{mover.points.length} checks</span>
          </>
        )}
      </p>
    </li>
  );
}

/**
 * A dependency-free sparkline. The y-range hugs the skill's own scores (at
 * least 30 points tall) so a real change is visible; the delta pill and the
 * numbers carry the comparison between cards.
 */
function Sparkline({ points, color }: { points: TrendPoint[]; color: string }) {
  const gid = useId().replace(/:/g, "");
  const W = 200;
  const H = 56;
  const pad = 4;
  const scores = points.map((p) => p.score);
  let lo = Math.min(...scores);
  let hi = Math.max(...scores);
  const grow = Math.max(0, 30 - (hi - lo)) / 2;
  lo = Math.max(0, lo - grow - 5);
  hi = Math.min(100, hi + grow + 5);
  // Clamped at an end of the scale: take the missing height from the other side.
  if (hi - lo < 30) {
    if (lo === 0) hi = 30;
    else lo = 70;
  }
  const yOf = (score: number) => pad + (1 - (score - lo) / (hi - lo)) * (H - pad * 2);
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0;
  const xy = points.map((p, i) => {
    // Spaced by time; by order when every check shares a timestamp.
    const f = points.length === 1 ? 0.5 : span > 0 ? (p.t - t0) / span : i / (points.length - 1);
    return { x: pad + f * (W - pad * 2), y: yOf(p.score) };
  });
  const line = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* the Proficient line (60), for reference, when it's in range */}
      {lo < 60 && hi > 60 && <line x1={0} x2={W} y1={yOf(60)} y2={yOf(60)} stroke="#CFE3DD" strokeDasharray="3 4" />}
      {xy.length > 1 && (
        <>
          <path d={`${line} L${last.x.toFixed(1)},${H} L${xy[0].x.toFixed(1)},${H} Z`} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      <circle cx={last.x} cy={last.y} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
    </svg>
  );
}
