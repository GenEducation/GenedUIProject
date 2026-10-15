"use client";

import { BookOpenCheck, Clock3, Flame, Star, type LucideIcon } from "lucide-react";

import { STUDENT_COLORS } from "../theme/colors";
import { STRINGS } from "../constants/strings";

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
  type Card = { key: string; Icon: LucideIcon; label: string; parts: { n: number; u: string }[] | null; of?: number };
  const streaks: Card[] = STATS.map((s) => ({
    key: s.key,
    Icon: s.Icon,
    label: s.label,
    // "1 Day", "0 Days", "4 Days".
    parts: [{ n: data?.[s.key] ?? 0, u: (data?.[s.key] ?? 0) === 1 ? s.unit : `${s.unit}s` }],
  }));
  const cards: Card[] = [
    streaks[0],
    ...(showChapters
      ? [{
          key: "chaptersCompleted",
          Icon: BookOpenCheck,
          label: STRINGS.streak.chaptersCompleted,
          parts: chapters == null ? null : [{ n: chapters.completed, u: "" }],
          of: chapters?.total,
        }]
      : []),
    ...streaks.slice(1),
    ...(showTime
      ? [{
          key: "timeSpent",
          Icon: Clock3,
          label: STRINGS.streak.timeSpent,
          parts: totalMinutes == null ? null : studyTimeParts(totalMinutes),
        }]
      : []),
  ];

  return (
    <div
      className={cards.length === 4 ? "grid grid-cols-2 lg:grid-cols-4" : cards.length === 3 ? "grid grid-cols-3" : "grid grid-cols-2"}
      style={{ gap: "clamp(8px, 1.2vw, 14px)" }}
    >
      {isLoading
        ? cards.map((c) => c.key).map((n) => (
            <div
              key={n}
              className="rounded-2xl animate-pulse"
              style={{
                background: STUDENT_COLORS.card,
                border: `1px solid ${STUDENT_COLORS.border}`,
                padding: "clamp(14px, 1.6vw, 20px)",
              }}
            >
              <div className="flex items-start justify-between" style={{ gap: 10 }}>
                <div className="rounded" style={{ background: STUDENT_COLORS.border + "40", height: 11, width: 84 }} />
                <div
                  className="rounded-lg flex-shrink-0"
                  style={{ background: STUDENT_COLORS.border + "50", width: 28, height: 28 }}
                />
              </div>
              <div className="rounded mt-3" style={{ background: STUDENT_COLORS.border + "60", height: 22, width: 68 }} />
            </div>
          ))
        : cards.map((s) => {
            return (
              <div
                key={s.key}
                className="rounded-2xl"
                style={{
                  background: STUDENT_COLORS.card,
                  border: `1px solid ${STUDENT_COLORS.border}`,
                  padding: "clamp(14px, 1.6vw, 20px)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                {/* Label left, icon well right */}
                <div className="flex items-start justify-between" style={{ gap: 10 }}>
                  <span
                    className="font-medium"
                    style={{
                      color: STUDENT_COLORS.textMuted,
                      fontSize: "clamp(11px, 1.05vw, 13px)",
                      lineHeight: 1.3,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      // Soft-surface well, teal glyph — calm chrome; citron is
                      // kept for the screen's one key moment.
                      background: STUDENT_COLORS.softSurface,
                      width: "clamp(26px, 2.4vw, 32px)",
                      height: "clamp(26px, 2.4vw, 32px)",
                      color: STUDENT_COLORS.primary,
                    }}
                  >
                    <s.Icon size={16} strokeWidth={2.2} />
                  </span>
                </div>

                {/* Value, with its unit carried in the value as the design does */}
                <div
                  className="font-extrabold leading-none mt-2.5"
                  style={{
                    color: STUDENT_COLORS.text,
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(19px, 2.1vw, 26px)",
                  }}
                >
                  {s.parts === null
                    ? "—"
                    : s.parts.map((p, i) => (
                        <span key={i} style={{ marginLeft: i ? 6 : 0 }}>
                          {p.n}
                          {p.u && (
                            <span style={{ fontSize: "0.72em", marginLeft: p.u.length > 1 ? 5 : 1 }}>{p.u}</span>
                          )}
                        </span>
                      ))}
                  {s.parts !== null && s.of != null && (
                    <span style={{ fontSize: "0.72em", marginLeft: 5, color: STUDENT_COLORS.textMuted }}>/ {s.of}</span>
                  )}
                </div>
              </div>
            );
          })}
    </div>
  );
}
