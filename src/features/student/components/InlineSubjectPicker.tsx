"use client";

import { X } from "lucide-react";
import { getSubjectConfig } from "@/constants/subjectConfig";
import {
  subjectsForGrade,
  type ExactSubject,
  useSubjectCatalog,
} from "@/features/subjects/subjectCatalog";
import { SubjectIcon } from "@/features/subjects/subjectPresentation";
import { useStudentStore } from "../store/useStudentStore";

interface InlineSubjectPickerProps {
  selectedSubject: ExactSubject | null;
  onSelectSubject: (subject: ExactSubject | null) => void;
  onDismiss: () => void;
}

export function InlineSubjectPicker({ selectedSubject, onSelectSubject, onDismiss }: InlineSubjectPickerProps) {
  const grade = useStudentStore((state) => state.studentProfile?.grade);
  const catalog = useSubjectCatalog((state) => state.subjects);
  const subjects = subjectsForGrade(grade, catalog);

  return (
    <div className="flex items-center gap-2 px-4 py-2 mb-1 bg-white rounded-2xl border border-[var(--primary-ink)]/8 shadow-sm flex-wrap">
      <span className="text-[10px] font-extrabold text-[var(--primary-ink)]/40 uppercase tracking-widest flex-shrink-0">
        Subject
      </span>
      <div className="flex items-center gap-1.5 flex-1 flex-wrap">
        {subjects.map((subject) => {
          const config = getSubjectConfig(subject);
          const isSelected = selectedSubject === subject;
          return (
            <button
              key={subject}
              onClick={() => onSelectSubject(isSelected ? null : subject)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border"
              style={{
                backgroundColor: isSelected ? config.color : config.bgColor,
                borderColor: config.color,
                color: isSelected ? "#fff" : config.color,
              }}
            >
              <SubjectIcon
                subject={subject}
                size={12}
                style={{ "--icon-color": isSelected ? "#fff" : config.color } as React.CSSProperties}
              />
              {subject}
            </button>
          );
        })}
      </div>
      <button
        onClick={onDismiss}
        className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--primary-ink)]/30 hover:text-[var(--primary-ink)]/60 hover:bg-[var(--primary-ink)]/5 transition-all flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
