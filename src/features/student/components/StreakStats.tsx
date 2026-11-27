"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Star, type LucideIcon } from "lucide-react";

import { STUDENT_COLORS } from "../theme/colors";
import { STRINGS } from "../constants/strings";
import {
  CAMP_FIRE_ART,
  CAMP_HOURGLASS_ART,
  CAMP_SUMMIT_ART,
  CHAPTERS_ART,
  LONGEST_ART,
  STREAK_ART,
  TIME_ART,
  type CampArt,
  type LayeredArt,
} from "../theme/progressArt";

/**
 * Shared streak/session stat display. Previously StudentHome.tsx,
 * StudentProfile.tsx, and StudentChatHub.tsx each rendered the same three
 * numbers (day streak, sessions, best streak) with different icons, labels,
 * colors, and formatting — this is the single source for all three.
 */
export interface StreakStatsData {
  currentStreak: number;
  longestStreak: number;
}

const STATS: {
  key: "currentStreak" | "longestStreak";
  Icon: LucideIcon;
  label: string;
  color: string;
  unit: string;
}[] = [
  { key: "currentStreak", Icon: Flame, label: STRINGS.streak.dayStreak, color: STUDENT_COLORS.warn, unit: "Day" },
  { key: "longestStreak", Icon: Star, label: STRINGS.streak.longestStreak, color: STUDENT_COLORS.subjectMath, unit: "Day" },
];

/**
 * Minutes → value/unit pairs for the card ("45 min", "2h 15m", "3h").
 * Kept as parts so the numbers render large and the units small, matching
 * the other cards' "0 Days".
 */
export function studyTimeParts(minutes: number): { n: number; u: string }[] {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return [{ n: total, u: "min" }];
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? [{ n: h, u: "h" }, { n: m, u: "m" }] : [{ n: h, u: "h" }];
}

/**
 * Each render is fitted to its 512px frame by its longest side, so a tall trophy fills the frame and a flat chain looks
 * small. These even them out: scaled to the same visual weight (the square root of the drawn area, measured from each
 * render's pixels) and moved so they all stand on one line, 82% down the box, centred.
 */
const FIT: Record<string, string> = {
  currentStreak: "translate(-0.2%, 13.2%) scale(1.174)",
  chaptersCompleted: "translate(-0.6%, 7%) scale(0.987)",
  longestStreak: "translate(1.4%, 0.2%) scale(0.864)",
  timeSpent: "translate(-0.1%, 2%) scale(0.875)",
};

export function StreakStats({
  data,
  isLoading,
  variant = "card",
  totalMinutes,
  chapters,
}: {
  data: StreakStatsData | null;
  isLoading?: boolean;
  variant?: "card" | "strip" | "camp";
  /**
   * Card variant only. When passed, a fourth "Time Spent" card is shown:
   * a number of minutes, `null` if it couldn't be loaded (shows "—"), or
   * `undefined` to leave the card out.
   */
  totalMinutes?: number | null;
  /**
   * Card variant only. When passed, a "Chapters Completed" card (completed / total, as the report card counts them) sits
   * after the current streak: `null` if it couldn't be loaded (shows "—"), or `undefined` to leave the card out.
   */
  chapters?: { completed: number; total: number } | null;
}) {
  if (variant === "strip") {
    return (
      <div
        style={{
          display: "flex",
          gap: 0,
          width: "100%",
          justifyContent: "space-around",
        }}
      >
        {STATS.map((s) => (
          <div key={s.key} style={{ flex: 1, textAlign: "center", maxWidth: 120 }}>
            <div
              style={{
                fontSize: "clamp(18px,3vw,22px)",
                fontWeight: 800,
                color: s.color,
                fontFamily: "var(--font-display)",
              }}
            >
              <s.Icon size={18} strokeWidth={2.2} style={{ display: "inline", verticalAlign: "-3px", marginRight: 4 }} />
              {isLoading ? "—" : (data?.[s.key] ?? 0)}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: STUDENT_COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginTop: 2,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "camp") {
    return <CampProgress data={data} isLoading={isLoading} totalMinutes={totalMinutes} chapters={chapters} />;
  }

  const showTime = totalMinutes !== undefined;
  const showChapters = chapters !== undefined;
  type Card = {
    key: string;
    label: string;
    parts: { n: number; u: string }[] | null;
    of?: number;
    /** The card's 3D model and a line saying what the number means. */
    art: LayeredArt;
    caption: string;
  };
  const current = data?.currentStreak ?? 0;
  const best = data?.longestStreak ?? 0;
  const days = (n: number) => [{ n, u: n === 1 ? "Day" : "Days" }];
  const cards: Card[] = [
    {
      key: "currentStreak",
      label: STRINGS.streak.dayStreak,
      parts: days(current),
      art: STREAK_ART,
      caption: "Days in a row you've learned. Keep it going!",
    },
    ...(showChapters
      ? [{
          key: "chaptersCompleted",
          label: STRINGS.streak.chaptersCompleted,
          parts: chapters == null ? null : [{ n: chapters.completed, u: "" }],
          of: chapters?.total,
          art: CHAPTERS_ART,
          caption: "Chapters you've finished",
        }]
      : []),
    {
      key: "longestStreak",
      label: STRINGS.streak.longestStreak,
      parts: days(best),
      art: LONGEST_ART,
      caption: "Your record run of days",
    },
    ...(showTime
      ? [{
          key: "timeSpent",
          label: STRINGS.streak.timeSpent,
          parts: totalMinutes == null ? null : studyTimeParts(totalMinutes),
          art: TIME_ART,
          caption: "Time spent learning",
        }]
      : []),
  ];

  const cardStyle: React.CSSProperties = {
    background: STUDENT_COLORS.card,
    border: `1px solid ${STUDENT_COLORS.border}`,
    padding: "0 clamp(12px, 1.4vw, 18px) clamp(14px, 1.6vw, 18px)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  };
  /** The picture's box: every icon gets the same one. */
  const well: React.CSSProperties = {
    width: "clamp(104px, 11vw, 150px)",
    aspectRatio: "1 / 1",
  };

  return (
    <div
      className={cards.length === 4 ? "grid grid-cols-2 lg:grid-cols-4" : cards.length === 3 ? "grid grid-cols-3" : "grid grid-cols-2"}
      style={{ gap: "clamp(8px, 1.2vw, 14px)" }}
    >
      {isLoading
        ? cards.map((c) => (
            <div key={c.key} className="rounded-[22px] animate-pulse flex flex-col items-center" style={cardStyle}>
              <div className="rounded-full" style={{ ...well, background: STUDENT_COLORS.border + "30", transform: "scale(0.7)" }} />
              <div className="rounded" style={{ background: STUDENT_COLORS.border + "60", height: 22, width: 68 }} />
              <div className="rounded mt-2" style={{ background: STUDENT_COLORS.border + "40", height: 11, width: 84 }} />
            </div>
          ))
        : cards.map((s) => (
            <div key={s.key} className="group rounded-[22px] flex flex-col items-center text-center min-w-0" style={cardStyle}>
              {/* The paper, and its lime part on top: on hover only the lime moves (see .stat-accent in globals.css). */}
              <div aria-hidden="true" className="relative select-none" style={{ ...well, marginBottom: -4 }}>
                {/* One soft ground shadow, the same under every icon (the renders carry none of their own). */}
                <div
                  className="absolute rounded-[50%]"
                  style={{ left: "24%", right: "24%", top: "78.5%", height: "7%", background: "rgba(29,99,21,0.13)", filter: "blur(5px)" }}
                />
                {/* Fitted so every icon carries the same weight and stands on the same line (see FIT). */}
                <div className="absolute inset-0" style={{ transform: FIT[s.key] ?? undefined }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 512px WebP, served as is */}
                  <img src={s.art.base} alt="" width={512} height={512} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
                  {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 512px WebP, served as is */}
                  <img src={s.art.accent} alt="" width={512} height={512} draggable={false} className={`stat-accent stat-accent--${s.key} absolute inset-0 h-full w-full object-contain`} />
                </div>
              </div>

              {/* Value, with its unit carried in the value as the design does */}
              <div
                className="font-extrabold leading-none"
                style={{
                  color: STUDENT_COLORS.text,
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(22px, 2.4vw, 30px)",
                }}
              >
                {s.parts === null
                  ? "—"
                  : s.parts.map((p, i) => (
                      <span key={i} style={{ marginLeft: i ? 6 : 0 }}>
                        {p.n}
                        {p.u && (
                          <span style={{ fontSize: "0.6em", marginLeft: p.u.length > 1 ? 4 : 1 }}>{p.u}</span>
                        )}
                      </span>
                    ))}
                {s.parts !== null && s.of != null && (
                  <span style={{ fontSize: "0.6em", marginLeft: 5, color: STUDENT_COLORS.textMuted }}>/ {s.of}</span>
                )}
              </div>
              <div className="font-bold mt-1.5" style={{ color: STUDENT_COLORS.textMid, fontSize: "clamp(12px, 1.1vw, 14px)" }}>
                {s.label}
              </div>
              <div className="mt-0.5" style={{ color: STUDENT_COLORS.textMuted, fontSize: "clamp(10px, 0.95vw, 12px)", lineHeight: 1.35, maxWidth: "24ch" }}>
                {s.caption}
              </div>
            </div>
          ))}
    </div>
  );
}

/** How far each camp diorama rises above its card's top edge (the art breaks out of the card, like the subjects). */
const CAMP_RISE = 44;

/**
 * The dashboard's progress as one small expedition: three short cards, each with its diorama standing up out of the
 * card on the left (a campfire for the day streak, a summit flag for chapters finished, an hourglass for time
 * learning) and its number beside it. The pictures stay the same whatever the numbers; hovering a card plays its
 * diorama's move once (rendered in Blender, like the subject cards). On phones the three stack.
 */
function CampProgress({
  data,
  isLoading,
  totalMinutes,
  chapters,
}: {
  data: StreakStatsData | null;
  isLoading?: boolean;
  totalMinutes?: number | null;
  chapters?: { completed: number; total: number } | null;
}) {
  const current = data?.currentStreak ?? 0;
  const best = data?.longestStreak ?? 0;
  const items: { key: string; art: CampArt; value: React.ReactNode; label: string; sub?: string }[] = [
    {
      key: "currentStreak",
      art: CAMP_FIRE_ART,
      value: <Num parts={[{ n: current, u: current === 1 ? "Day" : "Days" }]} />,
      label: "Day streak",
      sub: `Best: ${best} ${best === 1 ? "day" : "days"}`,
    },
    ...(chapters !== undefined
      ? [{
          key: "chaptersCompleted",
          art: CAMP_SUMMIT_ART,
          value: chapters == null ? "—" : <Num parts={[{ n: chapters.completed, u: "" }]} of={chapters.total} />,
          label: "Chapters finished",
        }]
      : []),
    ...(totalMinutes !== undefined
      ? [{
          key: "timeSpent",
          art: CAMP_HOURGLASS_ART,
          value: totalMinutes == null ? "—" : <Num parts={studyTimeParts(totalMinutes)} />,
          label: "Time learning",
          sub: "Estimated",
        }]
      : []),
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "clamp(10px, 1.2vw, 14px)", rowGap: CAMP_RISE + 10, paddingTop: CAMP_RISE }}>
      {items.map((it) => (
        <CampCard key={it.key} art={it.art} value={it.value} label={it.label} sub={it.sub} isLoading={isLoading} />
      ))}
    </div>
  );
}

function CampCard({
  art,
  value,
  label,
  sub,
  isLoading,
}: {
  art: CampArt;
  value: React.ReactNode;
  label: string;
  sub?: string;
  isLoading?: boolean;
}) {
  const { sprite } = art;
  const [hover, setHover] = useState(false);
  const [ready, setReady] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const raf = useRef<number | null>(null);

  // Fetch the move's frames once the page is idle, so the first hover doesn't wait on the network.
  useEffect(() => {
    let live = true;
    const load = () => {
      const img = new Image();
      img.src = sprite.src;
      const done = () => live && setReady(true);
      if (typeof img.decode === "function") img.decode().then(done, () => {});
      else img.onload = done;
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(load) : window.setTimeout(load, 1200);
    return () => {
      live = false;
      if (!idle) window.clearTimeout(id);
    };
  }, [sprite.src]);

  /** Swap the still for the frames while a move plays (straight on the elements, no re-render mid-move). */
  const setShown = useCallback((on: boolean) => {
    if (frameRef.current) frameRef.current.style.opacity = on ? "1" : "0";
    if (stillRef.current) stillRef.current.style.opacity = on ? "0" : "1";
  }, []);

  // Play once on hover; it ends where it began, so the still comes back at the end.
  useEffect(() => {
    if (!ready || !hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = frameRef.current;
    if (!el) return;
    const rows = Math.ceil(sprite.frames / sprite.cols);
    const show = (f: number) => {
      const col = f % sprite.cols;
      const row = Math.floor(f / sprite.cols);
      el.style.backgroundPosition = `${(col / (sprite.cols - 1)) * 100}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`;
    };
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    show(0);
    setShown(true);
    const start = performance.now();
    const tick = (now: number) => {
      const f = Math.min(sprite.frames - 1, Math.floor(((now - start) / 1000) * sprite.fps));
      show(f);
      if (f < sprite.frames - 1) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
        setShown(false);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [hover, ready, sprite, setShown]);
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex items-center min-w-0 rounded-[22px]"
      style={{
        height: 118,
        background: STUDENT_COLORS.card,
        border: `1px solid ${STUDENT_COLORS.border}`,
        boxShadow: hover ? "0 18px 34px -22px rgba(29,99,21,0.45)" : "0 1px 5px rgba(0,0,0,0.04)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "transform .25s ease, box-shadow .25s ease",
      }}
    >
      {/* The diorama, standing up out of the card on the left */}
      <div aria-hidden="true" className="relative shrink-0 self-stretch select-none" style={{ width: "clamp(150px, 13vw, 176px)" }}>
        <div className="absolute" style={{ left: 10, bottom: 6, width: "clamp(140px, 12vw, 164px)", aspectRatio: "1 / 1" }}>
          {isLoading ? (
            <div className="absolute rounded-full animate-pulse" style={{ inset: "30% 16% 14%", background: STUDENT_COLORS.border + "40" }} />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size WebPs, served as they are */}
              <img ref={stillRef} src={art.still} alt="" width={400} height={400} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
              <div
                ref={frameRef}
                className="absolute inset-0"
                style={{
                  backgroundImage: ready ? `url(${sprite.src})` : undefined,
                  backgroundSize: `${sprite.cols * 100}% ${Math.ceil(sprite.frames / sprite.cols) * 100}%`,
                  backgroundRepeat: "no-repeat",
                  opacity: 0,
                }}
              />
            </>
          )}
        </div>
      </div>
      <div className="min-w-0" style={{ paddingRight: "clamp(12px, 1.4vw, 18px)" }}>
        <div className="font-extrabold leading-none" style={{ color: STUDENT_COLORS.text, fontFamily: "var(--font-display)", fontSize: "clamp(24px, 2.4vw, 30px)" }}>
          {isLoading ? <span className="inline-block rounded animate-pulse" style={{ width: 64, height: 24, background: STUDENT_COLORS.border + "60" }} /> : value}
        </div>
        <div className="mt-1.5 font-bold" style={{ color: STUDENT_COLORS.textMid, fontSize: "clamp(12px, 1.1vw, 14px)" }}>
          {label}
        </div>
        {sub && (
          <div className="mt-0.5" style={{ color: STUDENT_COLORS.textMuted, fontSize: "clamp(11px, 0.95vw, 12px)" }}>
            {isLoading ? "\u00a0" : sub}
          </div>
        )}
      </div>
    </div>
  );
}

/** A number with its unit small beside it ("4h 48m", "2 / 38"). */
function Num({ parts, of }: { parts: { n: number; u: string }[]; of?: number }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} style={{ marginLeft: i ? 6 : 0 }}>
          {p.n}
          {p.u && <span style={{ fontSize: "0.6em", marginLeft: p.u.length > 1 ? 4 : 1 }}>{p.u}</span>}
        </span>
      ))}
      {of != null && <span style={{ fontSize: "0.6em", marginLeft: 5, color: STUDENT_COLORS.textMuted }}>/ {of}</span>}
    </>
  );
}
