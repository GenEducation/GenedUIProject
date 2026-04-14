import React, { useState } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip 
} from "recharts";
import { ChevronDown, ChevronUp, Sigma, Info, Lock } from "lucide-react";

export const SkillMasteryView: React.FC = () => {
  const { cgScores, skillTree } = useAnalyticsStore();
  const [expandedCgs, setExpandedCgs] = useState<string[]>([]);
  const [expandedConcepts, setExpandedConcepts] = useState<string[]>([]);
  const [expandedLos, setExpandedLos] = useState<string[]>([]);

  const toggleCg = (id: string) => {
    setExpandedCgs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleConcept = (id: string) => {
    setExpandedConcepts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleLoJustification = (id: string) => {
    setExpandedLos(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const radarData = cgScores.map(cg => {
    const mastery = Math.round((cg.avg_mastery || 0) * 100);
    return {
      subject: cg.cg_name,
      A: mastery,
      fullMark: 100
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Radar Chart Section */}
      <div className="bg-white p-8 rounded-[40px] border border-[#1a3a2a]/5 shadow-sm min-h-[450px] flex flex-col items-center">
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#1a3a2a" strokeOpacity={0.1} />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: "#1a3a2a", fontSize: 11, fontWeight: 700, opacity: 0.8 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={false} 
                axisLine={false} 
              />
              <Tooltip 
                formatter={(value: any) => [`${value}%`, "Mastery"]}
                contentStyle={{ 
                  backgroundColor: "#1a3a2a", 
                  borderRadius: "12px", 
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "8px 12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                }}
                itemStyle={{ color: "#fff" }}
                cursor={{ stroke: "#1a3a2a", strokeWidth: 1 }}
              />
              <Radar
                name="Mastery"
                dataKey="A"
                stroke="#1a3a2a"
                fill="#059669"
                fillOpacity={0.3}
                strokeWidth={3}
                dot={{ 
                  r: 4, 
                  fill: "#1a3a2a", 
                  stroke: "#fff", 
                  strokeWidth: 2 
                }}
                activeDot={{ r: 6 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Objectives Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <h4 className="text-xl font-bold text-[#1a3a2a]">Learning objectives by competency</h4>
          <button className="text-xs font-bold uppercase tracking-wider text-[#1a3a2a]/70 flex items-center gap-1 hover:text-[#1a3a2a] transition-colors">
            Expand All <ChevronDown size={14} className="opacity-60" />
          </button>
        </div>

        <div className="space-y-4">
          {skillTree.map((cg) => {
            const scoreObj = cgScores.find(s => s.cg_id === cg.cg_id);
            const displayMastery = scoreObj ? Math.round(scoreObj.avg_mastery * 100) : Math.round((cg.avg_mastery || 0) * 100);

            return (
              <div 
                key={cg.cg_id}
                className="bg-white rounded-[40px] border border-[#1a3a2a]/5 shadow-sm overflow-hidden transition-all duration-300"
              >
                <div 
                  className={`px-8 py-6 flex items-center justify-between transition-colors ${
                    displayMastery === 0 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50/50' 
                      : expandedCgs.includes(cg.cg_id) 
                        ? 'bg-[#F4F3EE]/50 cursor-pointer' 
                        : 'hover:bg-[#F4F3EE]/30 cursor-pointer'
                  }`}
                  onClick={() => displayMastery > 0 && toggleCg(cg.cg_id)}
                >
                  <span className="text-base font-bold text-[#1a3a2a]">{cg.cg_name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-base font-bold text-[#1a3a2a]">{displayMastery}%</span>
                    {displayMastery === 0 ? (
                      <Lock size={18} className="text-[#1a3a2a]/40" />
                    ) : (
                      <ChevronDown 
                        size={20} 
                        className={`text-[#1a3a2a]/20 transition-transform duration-300 ${expandedCgs.includes(cg.cg_id) ? 'rotate-180' : ''}`} 
                      />
                    )}
                  </div>
                </div>

                {/* Concepts List */}
                {expandedCgs.includes(cg.cg_id) && (
                  <div className="px-8 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {cg.concepts?.map((concept: any) => (
                      <div key={concept.c_id} className="space-y-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleConcept(concept.c_id);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-[#1a3a2a] tracking-tight">{concept.c_name}</h5>
                            <ChevronDown size={14} className={`text-[#1a3a2a]/40 transition-transform ${expandedConcepts.includes(concept.c_id) ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* LOs under Concept */}
                        {expandedConcepts.includes(concept.c_id) && (
                          <div className="space-y-6 pl-2 animate-in fade-in duration-200">
                            {concept.los?.map((lo: any, idx: number) => {
                              const loMastery = Math.round((lo.mastery_level || 0) * 100);
                              const loId = `${concept.c_id}-${idx}`; // Unique ID for toggle state
                              return (
                                <div key={idx} className="group flex flex-col gap-3">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium text-[#1a3a2a] leading-relaxed max-w-2xl">{lo.skill_name}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xl font-bold text-[#1a3a2a] opacity-80">{loMastery}%</span>
                                      <p className="text-[10px] font-black uppercase text-[#059669] tracking-tighter">Proficient</p>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="h-1.5 w-full bg-[#1a3a2a]/5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#059669] rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${loMastery}%` }}
                                      />
                                    </div>
                                    
                                    <div className="flex flex-col gap-3">
                                      <div className="flex items-center gap-6">
                                        <button 
                                          onClick={() => toggleLoJustification(loId)}
                                          className="text-[11px] font-bold text-[#1a3a2a]/60 hover:text-[#1a3a2a] underline decoration-dotted transition-colors"
                                        >
                                          {expandedLos.includes(loId) ? "Hide justification" : "See why"}
                                        </button>
                                        <span className="text-[11px] font-bold text-[#1a3a2a]/40">
                                          {lo.assessment_count || 0} assessment{lo.assessment_count !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                      
                                      {expandedLos.includes(loId) && (
                                        <div className="p-4 bg-[#F4F3EE] rounded-2xl animate-in slide-in-from-top-1 duration-200">
                                          <p className="text-xs italic text-[#1a3a2a]/70 font-medium leading-relaxed">
                                            "{lo.justification || "Mastery based on consistent performance in recent practice sessions."}"
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="h-[1px] w-full bg-[#1a3a2a]/5 last:hidden" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
