import React from "react";
import { UnitCard } from "./UnitCard";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { useRouter } from "next/navigation";

interface ChapterMasteryViewProps {
  mode?: "student" | "parent";
}

export const ChapterMasteryView: React.FC<ChapterMasteryViewProps> = ({ mode = "student" }) => {
  const router = useRouter();
  const { startFocusedSession } = useStudentStore();
  const { analyticsChapterMastery, selectedAnalyticsSubject } = useAnalyticsStore();

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
          onAction={() => { 
            const newId = startFocusedSession(item.document_title, selectedAnalyticsSubject); 
            router.push(`/student/chat/${newId}`); 
          }}
          hideActions={mode === "parent"}
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
