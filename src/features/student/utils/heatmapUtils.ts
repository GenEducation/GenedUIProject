import { authFetch } from "@/utils/authFetch";

export interface HeatmapDay {
  date: string | null;
  count: number;
  isFuture: boolean;
}

export interface HeatmapMonth {
  label: string;
  year: number;
  weeks: HeatmapDay[][];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

// Fetch activity data from the API
export async function fetchActivityData(studentId: string): Promise<Record<string, number>> {
  try {
    const response = await authFetch(`${API_BASE_URL}/students/${studentId}/activity?days=365`);
    if (!response.ok) throw new Error("Failed to fetch activity data");
    const data = await response.json();
    return data.activities || {};
  } catch (error) {
    console.error("Failed to fetch activity data:", error);
    return {};
  }
}

// Build 12-month grid (last 365 days ending today)
export function buildHeatmapMonths(activityData: Record<string, number>): HeatmapMonth[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate 365 days ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 365);

  const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months: HeatmapMonth[] = [];
  const processedMonths = new Set<string>();

  // Iterate through all months from 365 days ago to today
  let current = new Date(startDate);
  while (current <= today) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthKey = `${year}-${month}`;

    if (!processedMonths.has(monthKey)) {
      processedMonths.add(monthKey);

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDow = new Date(year, month, 1).getDay(); // 0=Sun

      const totalSlots = Math.ceil((firstDow + daysInMonth) / 7) * 7;
      const flat: HeatmapDay[] = [];

      for (let slot = 0; slot < totalSlots; slot++) {
        const dayNum = slot - firstDow + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
          flat.push({ date: null, count: 0, isFuture: false });
        } else {
          const d = new Date(year, month, dayNum);
          const iso = `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
          flat.push({
            date: iso,
            count: activityData[iso] ?? 0,
            isFuture: d > today,
          });
        }
      }

      const weeks: HeatmapDay[][] = [];
      for (let w = 0; w < flat.length / 7; w++) {
        weeks.push(flat.slice(w * 7, w * 7 + 7));
      }

      months.push({ label: MONTH_LABELS[month], year, weeks });
    }

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export function getActivityColor(count: number, isFuture: boolean): string {
  if (isFuture) return "rgba(4,46,92,0.025)";
  switch (count) {
    case 0: return "rgba(4,46,92,0.06)";
    case 1: return "#9be9a8";
    case 2: return "#40c463";
    case 3: return "#30a14e";
    default: return "#216e39";
  }
}
