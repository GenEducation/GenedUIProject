import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, BookOpen, ChevronDown } from "lucide-react";
import { useAnalyticsStore, SkillProgressionEntry, OverallHistoryPoint } from "@/store/useAnalyticsStore";

// -- Constants ----------------------------------------------------------------

const LINE_COLORS = [
  "#059669", // primary green
  "#7C3AED", // purple
  "#0EA5E9", // sky blue
  "#F59E0B", // amber
  "#EC4899", // pink
  "#10B981", // emerald
  "#6366F1", // indigo
  "#EF4444", // red
];

// -- Helpers ------------------------------------------------------------------

/**
 * Formats ISO to a readable Date + Time for the tooltip
 */
function formatFullDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return iso;
  }
}

function buildChartData(
  skills: SkillProgressionEntry[],
  overallHistory: OverallHistoryPoint[]
): Record<string, string | number>[] {
  const timestampSet = new Set<string>();

  skills.forEach((skill) => {
    const history = skill.history.length === 1
      ? [{ ...skill.history[0], recorded_at: getOriginDate(skill.history[0].recorded_at), mastery_level: 0 }, ...skill.history]
      : skill.history;
    history.forEach((p) => timestampSet.add(p.recorded_at));
  });

  // We still keep overall in the data set to ensure the X-axis accounts for all subject sessions
  overallHistory.forEach((p) => timestampSet.add(p.recorded_at));
  
  const sortedTimestamps = Array.from(timestampSet).sort();

  return sortedTimestamps.map((ts) => {
    const row: Record<string, string | number> = {
      fullLabel: formatFullDateTime(ts),
      _rawTs: ts,
    };

    skills.forEach((skill) => {
      const history = skill.history.length === 1
        ? [{ ...skill.history[0], recorded_at: getOriginDate(skill.history[0].recorded_at), mastery_level: 0 }, ...skill.history]
        : skill.history;
      const point = history.find((p) => p.recorded_at === ts);
      if (point !== undefined) {
        row[skill.skill_id] = Math.round(point.mastery_level * 100);
      }
    });

    return row;
  });
}

function getOriginDate(iso: string): string {
  try {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - 30); // Prepend point 30 mins before for single-session skills
    return d.toISOString();
  } catch {
    return iso;
  }
}

// -- Custom Tooltip -----------------------------------------------------------

interface TooltipPayloadItem {
  dataKey?: string;
  name?: string;
  color?: string;
  value?: number;
  payload?: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  // The label is stored in the payload's original data object
  const label = payload[0].payload.fullLabel;

  return (
    <div className="bg-[#1a3a2a] rounded-2xl px-4 py-3 shadow-xl border border-white/10">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">{label}</p>
      {payload
        .filter((p: TooltipPayloadItem) => p.value !== undefined)
        .map((entry: TooltipPayloadItem) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-black text-white">{entry.value}% Mastery</span>
          </div>
        ))}
    </div>
  );
};

// -- Main Component -----------------------------------------------------------

export const SkillProgression: React.FC = () => {
  const { skillProgression, skillProfileHistory, isProgressionLoading } = useAnalyticsStore();
  const [selectedSkillId, setSelectedSkillId] = useState<string>("all");

  // Initialize selected skill once data loads
  React.useEffect(() => {
    if (skillProgression.length > 0 && selectedSkillId === "all") {
      setSelectedSkillId(skillProgression[0].skill_id);
    }
  }, [skillProgression, selectedSkillId]);

  const chartData = useMemo(
    () => buildChartData(skillProgression, skillProfileHistory),
    [skillProgression, skillProfileHistory]
  );

  const selectedSkill = useMemo(
    () => skillProgression.find((s) => s.skill_id === selectedSkillId),
    [skillProgression, selectedSkillId]
  );

  const selectedSkillIndex = useMemo(
    () => skillProgression.findIndex((s) => s.skill_id === selectedSkillId),
    [skillProgression, selectedSkillId]
  );

  if (isProgressionLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-[40px] border border-[#1a3a2a]/5 shadow-sm h-[450px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[#059669]/20 border-t-[#059669] animate-spin" />
            <p className="text-sm font-bold text-[#1a3a2a]/50">Loading progression data…</p>
          </div>
        </div>
      </div>
    );
  }

  if (skillProgression.length === 0) {
    return (
      <div className="bg-white rounded-[40px] border border-[#1a3a2a]/5 shadow-sm h-[450px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-16 h-16 rounded-3xl bg-[#E5F2E9] flex items-center justify-center">
            <Activity size={28} className="text-[#059669]" />
          </div>
          <div>
            <p className="text-lg font-black text-[#1a3a2a]">No progression data yet</p>
            <p className="text-sm text-[#1a3a2a]/50 mt-1">
              Complete more assessments in this subject to see your skill progression over time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Selection & Skill Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dropdown Card */}
        <div className="bg-white p-8 rounded-[40px] border border-[#1a3a2a]/5 shadow-sm flex flex-col justify-center">
          <div className="space-y-1 mb-4">
            <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.2em]">Select Focus Skill</p>
            <h4 className="text-xl font-bold text-[#1a3a2a]">Deep-Dive Analysis</h4>
          </div>
          
          <div className="relative group">
            <select 
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full bg-[#F4F3EE] border-none rounded-2xl px-5 py-4 text-sm font-bold text-[#1a3a2a] appearance-none cursor-pointer focus:ring-2 focus:ring-[#059669]/20 transition-all"
            >
              {skillProgression.map(skill => (
                <option key={skill.skill_id} value={skill.skill_id}>
                  {skill.skill_name}
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#1a3a2a]/30 group-hover:text-[#059669] transition-colors">
              <ChevronDown size={18} />
            </div>
          </div>
        </div>

        {/* Skill Detail Card */}
        {selectedSkill && (
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-[#1a3a2a]/5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: LINE_COLORS[selectedSkillIndex % LINE_COLORS.length] }}
                  >
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-[#1a3a2a] leading-tight">{selectedSkill.skill_name}</h5>
                  </div>
                </div>
                <p className="text-sm text-[#1a3a2a]/60 leading-relaxed">
                  Your performance in this specific learning objective is being tracked based on interactive exercises and real-time feedback. 
                  The graph shows your mastery trend from initial assessment to your most recent session.
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-4xl font-black text-[#1a3a2a]">
                  {Math.round((selectedSkill.history[selectedSkill.history.length - 1]?.mastery_level || 0) * 100)}%
                </p>
                <p className="text-[10px] font-black uppercase text-[#059669] tracking-tighter">Current Mastery</p>
                <div className="mt-4 flex flex-col items-end gap-1">
                  <span className="px-3 py-1 bg-[#F4F3EE] rounded-full text-[10px] font-bold text-[#1a3a2a]/60">
                    {selectedSkill.history[selectedSkill.history.length - 1]?.assessment_count || 0} Assessments
                  </span>
                </div>
              </div>
            </div>
            
            <Activity 
              size={120} 
              className="absolute -right-8 -bottom-8 text-[#1a3a2a]/3 rotate-12" 
            />
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white p-8 rounded-[40px] border border-[#1a3a2a]/5 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-base font-black text-[#1a3a2a]">Progression Timeline</h4>
            <p className="text-xs text-[#1a3a2a]/50 mt-1">Hover over the line to see session date and time</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a3a2a" strokeOpacity={0.06} />

            <XAxis
              dataKey="_rawTs"
              tick={false}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#1a3a2a", fontSize: 11, fontWeight: 700, opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1a3a2a", strokeWidth: 1, strokeOpacity: 0.1 }} />

            {selectedSkill && (
              <Line
                key={selectedSkill.skill_id}
                type="monotone"
                dataKey={selectedSkill.skill_id}
                name={selectedSkill.skill_name}
                stroke={LINE_COLORS[selectedSkillIndex % LINE_COLORS.length]}
                strokeWidth={4}
                dot={{ r: 6, strokeWidth: 3, fill: "#fff", stroke: LINE_COLORS[selectedSkillIndex % LINE_COLORS.length] }}
                activeDot={{ r: 8, strokeWidth: 3 }}
                animationDuration={1500}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
