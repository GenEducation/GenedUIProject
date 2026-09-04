"use client";

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
  totalSessions: number;
  longestStreak: number;
}

const STATS = [
  { key: "currentStreak" as const, icon: "🔥", label: STRINGS.streak.dayStreak, color: STUDENT_COLORS.warn, unit: "Days" },
  { key: "totalSessions" as const, icon: "📚", label: STRINGS.streak.sessions, color: STUDENT_COLORS.tutorSoft, unit: "" },
  { key: "longestStreak" as const, icon: "⭐", label: STRINGS.streak.longestStreak, color: STUDENT_COLORS.subjectMath, unit: "Days" },
];

export function StreakStats({
  data,
  isLoading,
  variant = "card",
}: {
  data: StreakStatsData | null;
  isLoading?: boolean;
  variant?: "card" | "strip";
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
              {s.icon} {isLoading ? "—" : (data?.[s.key] ?? 0)}
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

  return (
    <div className="grid grid-cols-3" style={{ gap: "clamp(8px, 1.2vw, 14px)" }}>
      {isLoading
        ? [1, 2, 3].map((n) => (
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
        : STATS.map((s) => {
            const value = data?.[s.key] ?? 0;
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
                      background: s.color + "1F",
                      width: "clamp(24px, 2.2vw, 30px)",
                      height: "clamp(24px, 2.2vw, 30px)",
                      fontSize: "clamp(12px, 1.2vw, 15px)",
                    }}
                  >
                    {s.icon}
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
                  {value}
                  {s.unit && (
                    <span style={{ fontSize: "0.72em", marginLeft: 5 }}>{s.unit}</span>
                  )}
                </div>
              </div>
            );
          })}
    </div>
  );
}
