"use client";

import { buildHeatmapMonths, getActivityColor, fetchActivityData } from "../utils/heatmapUtils";
import { useMemo, useState, useEffect, useRef } from "react";
import { useStudentStore } from "../store/useStudentStore";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL = 14;
const GAP = 3;

export function ActivityHeatmap() {
  const { studentProfile } = useStudentStore();
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!studentProfile) return;
    let cancelled = false;
    const loadActivity = async () => {
      setIsLoading(true);
      const data = await fetchActivityData(studentProfile.user_id);
      if (!cancelled) {
        setActivityData(data);
        setIsLoading(false);
      }
    };
    loadActivity();
    return () => { cancelled = true; };
  }, [studentProfile]);

  const months = useMemo(() => buildHeatmapMonths(activityData), [activityData]);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Scroll to the right to show today's date at the end
  useEffect(() => {
    if (scrollContainerRef.current && !isLoading) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: "auto",
        });
      }, 0);
    }
  }, [months, isLoading]);

  if (isLoading) {
    return (
      <div className="w-full h-24 bg-gradient-to-r from-[#042E5C]/5 to-transparent rounded-2xl animate-pulse" />
    );
  }

  return (
    <div className="relative">
      <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-hidden pb-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-start gap-3">
          {/* Day labels */}
          <div
            className="flex flex-col flex-shrink-0 mt-5"
            style={{ gap: GAP, width: 10 }}
          >
            {DAY_LABELS.map((d, i) => (
              <div
                key={i}
                className="text-[#042E5C]/30 font-bold text-center"
                style={{
                  fontSize: 8,
                  height: CELL,
                  lineHeight: `${CELL}px`,
                  visibility: i % 2 === 0 ? "visible" : "hidden",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month columns */}
          {months.map((month, mi) => (
            <div key={`${month.year}-${month.label}-${mi}`} className="flex flex-col flex-shrink-0">
              {/* Month label */}
              <div
                className="text-[#042E5C]/40 font-bold mb-1 whitespace-nowrap"
                style={{ fontSize: 9, height: 14, lineHeight: "14px" }}
              >
                {month.label}
              </div>

              {/* Week columns side by side */}
              <div className="flex" style={{ gap: GAP }}>
                {month.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                    {week.map((day, di) => {
                      const bg = getActivityColor(day.count, day.isFuture);
                      const isEmpty = day.date === null;
                      return (
                        <div
                          key={di}
                          style={{
                            width: CELL,
                            height: CELL,
                            borderRadius: 2,
                            backgroundColor: isEmpty ? "transparent" : bg,
                            cursor: day.date ? "pointer" : "default",
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            if (!day.date) return;
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const container = (e.target as HTMLElement).closest(".relative")?.getBoundingClientRect();
                            const label =
                              day.count === 0
                                ? `No activity on ${day.date}`
                                : `${day.count} session${day.count > 1 ? "s" : ""} on ${day.date}`;
                            setTooltip({
                              text: label,
                              x: rect.left - (container?.left ?? 0) + CELL / 2,
                              y: rect.top - (container?.top ?? 0) - 28,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 px-2 py-1 rounded-lg bg-[#042E5C] text-white pointer-events-none whitespace-nowrap shadow-lg"
          style={{
            fontSize: 10,
            fontWeight: 700,
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateX(-50%)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
