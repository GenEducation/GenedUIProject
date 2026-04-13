import React from "react";
import { MessageSquare, ArrowRight, Lock, Zap } from "lucide-react";

interface UnitCardProps {
  unitId: string;
  title: string;
  mastery: number;
  status: "PROFICIENT" | "DEVELOPING" | "NEEDS WORK";
  coverage: number;
  sessions: number;
  isLocked?: boolean;
  prerequisite?: string;
  onAction?: () => void;
}

const statusColors = {
  "PROFICIENT": { text: "text-[#059669]", bg: "bg-[#059669]/5", label: "PROFICIENT", bar: "bg-[#059669]" },
  "DEVELOPING": { text: "text-[#D97706]", bg: "bg-[#D97706]/5", label: "DEVELOPING", bar: "bg-[#D97706]" },
  "NEEDS WORK": { text: "text-red-500", bg: "bg-red-500/5", label: "NEEDS WORK", bar: "bg-red-500" },
};

export const UnitCard: React.FC<UnitCardProps> = ({
  unitId,
  title,
  mastery,
  status,
  coverage,
  sessions,
  isLocked,
  prerequisite,
  onAction
}) => {
  const color = statusColors[status];

  if (isLocked) {
    return (
      <div className="bg-white/40 p-8 rounded-[40px] border border-[#1a3a2a]/5 relative overflow-hidden group">
        <div className="filter blur-[2px] opacity-20 select-none">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-[#1a3a2a]/60">{unitId}</span>
            <span className="text-3xl font-bold">0%</span>
          </div>
          <h4 className="text-xl font-bold mb-8 text-[#1a3a2a]">{title}</h4>
        </div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-[#1a3a2a]/20 mb-4">
            <Lock size={24} />
          </div>
          <p className="text-[12px] font-bold text-[#1a3a2a]/30 uppercase tracking-widest mb-1">Locked</p>
          {prerequisite && (
            <p className="text-[10px] font-medium text-[#1a3a2a]/20">Prerequisite: {prerequisite}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[40px] border border-[#1a3a2a]/5 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-[#1a3a2a]/60 bg-[#F4F3EE] px-3 py-1.5 rounded-full uppercase tracking-wider">{unitId}</span>
          <div className="text-right">
            <span className="text-3xl font-bold text-[#1a3a2a]">{mastery}%</span>
            <p className={`text-xs font-black tracking-tight ${color.text}`}>{color.label}</p>
          </div>
        </div>
        
        <h4 className="text-xl font-bold mb-8 text-[#1a3a2a] leading-tight group-hover:text-[#059669] transition-colors">{title}</h4>
        
        <div className="space-y-4 mb-10">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#1a3a2a]/70 uppercase tracking-widest">Content Coverage</span>
              <span className="text-xs font-bold text-[#1a3a2a]">{coverage}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#1a3a2a]/5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${color.bar} rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button 
          onClick={onAction}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
            status === 'NEEDS WORK' 
            ? 'bg-[#1a3a2a] text-white shadow-lg hover:shadow-[#1a3a2a]/20 translate-y-0 active:translate-y-0.5' 
            : 'text-[#1a3a2a] hover:bg-[#F4F3EE]'
          }`}
        >
          {mastery === 0 ? (
            <>Start Session <ArrowRight size={14} /></>
          ) : (
            <>Continue Session <ArrowRight size={14} /></>
          )}
        </button>
      </div>
    </div>
  );
};

import { useStudentStore } from "../../store/useStudentStore";

export const ChapterMasteryView: React.FC = () => {
  const { analyticsChapterMastery } = useStudentStore();

  const getStatus = (score: number): "PROFICIENT" | "DEVELOPING" | "NEEDS WORK" => {
    if (score >= 0.8) return "PROFICIENT";
    if (score >= 0.5) return "DEVELOPING";
    return "NEEDS WORK";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {analyticsChapterMastery.map((item, index) => (
        <UnitCard 
          key={index}
          unitId={`DOC-${index + 1}`}
          title={item.document_title}
          mastery={Math.round(item.mastery_score * 100)}
          status={getStatus(item.mastery_score)}
          coverage={item.completion_percentage}
          sessions={item.study_count}
        />
      ))}
      
      {/* Show an empty state if no data */}
      {analyticsChapterMastery.length === 0 && (
        <div key="empty-chapter-state" className="col-span-full py-20 text-center bg-white rounded-[40px] border border-[#1a3a2a]/5 shadow-sm">
          <p className="text-[#1a3a2a]/70 text-base font-medium italic">No chapter data found for this subject.</p>
        </div>
      )}
    </div>
  );
};
