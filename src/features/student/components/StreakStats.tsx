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
  { key: "currentStreak" as const, icon: "🔥", label: STRINGS.streak.dayStreak, color: STUDENT_COLORS.warn },
  { key: "totalSessions" as const, icon: "📚", label: STRINGS.streak.sessions, color: STUDENT_COLORS.tutorSoft },
  { key: "longestStreak" as const, icon: "⭐", label: STRINGS.streak.longestStreak, color: STUDENT_COLORS.subjectMath },
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
    <div className="grid grid-cols-3" style={{ gap: "clamp(8px, 1.5vw, 16px)" }}>
      {isLoading
        ? [1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl flex items-center animate-pulse"
              style={{
                background: STUDENT_COLORS.card,
                border: `1px solid ${STUDENT_COLORS.border}`,
                padding: "clamp(12px, 2vw, 20px) clamp(10px, 1.8vw, 18px)",
                gap: "clamp(8px, 1.2vw, 14px)",
              }}
            >
              <div
                className="rounded-xl flex-shrink-0"
                style={{
                  background: STUDENT_COLORS.border + "50",
                  width: "clamp(34px, 3.5vw, 44px)",
                  height: "clamp(34px, 3.5vw, 44px)",
                }}
              />
              <div className="min-w-0 flex flex-col gap-2">
                <div className="rounded" style={{ background: STUDENT_COLORS.border + "60", height: 20, width: 40 }} />
                <div className="rounded" style={{ background: STUDENT_COLORS.border + "40", height: 10, width: 64 }} />
              </div>
            </div>
          ))
        : STATS.map((s) => (
            <div
              key={s.key}
              className="rounded-2xl flex items-center"
              style={{
                background: STUDENT_COLORS.card,
                border: `1px solid ${STUDENT_COLORS.border}`,
                padding: "clamp(12px, 2vw, 20px) clamp(10px, 1.8vw, 18px)",
                gap: "clamp(8px, 1.2vw, 14px)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: s.color + "14",
                  width: "clamp(34px, 3.5vw, 44px)",
                  height: "clamp(34px, 3.5vw, 44px)",
                  fontSize: "clamp(15px, 1.8vw, 20px)",
                }}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <div
                  className="font-extrabold leading-none"
                  style={{ color: STUDENT_COLORS.text, fontFamily: "var(--font-display)", fontSize: "clamp(18px, 2.4vw, 26px)" }}
                >
                  {data?.[s.key] ?? 0}
                </div>
                <div
                  className="font-semibold mt-1 whitespace-nowrap"
                  style={{ color: STUDENT_COLORS.textMuted, fontSize: "clamp(10px, 1vw, 12px)" }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
    </div>
  );
}
