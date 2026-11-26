"use client";

import { Flame, Star, type LucideIcon } from "lucide-react";

import { STUDENT_COLORS } from "../theme/colors";
import { STRINGS } from "../constants/strings";
import { CHAPTERS_ART, LONGEST_ART, STREAK_ART, TIME_ART, type LayeredArt } from "../theme/progressArt";

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

export function StreakStats({
  data,
  isLoading,
  variant = "card",
  totalMinutes,
  chapters,
}: {
  data: StreakStatsData | null;
  isLoading?: boolean;
  variant?: "card" | "strip";
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
  /** The picture's patch of light: a soft-surface glow the island sits in. */
  const well: React.CSSProperties = {
    width: "clamp(104px, 11vw, 150px)",
    aspectRatio: "1 / 1",
    background: `radial-gradient(58% 48% at 50% 56%, ${STUDENT_COLORS.softSurface}, transparent 72%)`,
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
                {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 512px WebP, served as is */}
                <img src={s.art.base} alt="" width={512} height={512} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
                {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 512px WebP, served as is */}
                <img src={s.art.accent} alt="" width={512} height={512} draggable={false} className={`stat-accent stat-accent--${s.key} absolute inset-0 h-full w-full object-contain`} />
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
