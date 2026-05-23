"use client";

import { X } from "lucide-react";
import { SUBJECT_CONFIG, Subject } from "@/constants/subjectConfig";
import { EnglishIcon } from "@/components/icons/EnglishIcon";
import { MathematicsIcon } from "@/components/icons/MathematicsIcon";
import { ScienceIcon } from "@/components/icons/ScienceIcon";
import { HindiIcon } from "@/components/icons/HindiIcon";

const SUBJECTS: Subject[] = ["english", "mathematics", "science", "hindi"];

const ICON_MAP: Record<Subject, React.ComponentType<{ size: number; style?: React.CSSProperties }>> = {
  english: EnglishIcon,
  mathematics: MathematicsIcon,
  science: ScienceIcon,
  hindi: HindiIcon,
};

interface InlineSubjectPickerProps {
  selectedSubject: Subject | null;
  onSelectSubject: (subject: Subject | null) => void;
  onDismiss: () => void;
}

export function InlineSubjectPicker({ selectedSubject, onSelectSubject, onDismiss }: InlineSubjectPickerProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 mb-1 bg-white rounded-2xl border border-[#042E5C]/8 shadow-sm flex-wrap">
      <span className="text-[10px] font-extrabold text-[#042E5C]/40 uppercase tracking-widest flex-shrink-0">
        Subject
      </span>
      <div className="flex items-center gap-1.5 flex-1 flex-wrap">
        {SUBJECTS.map((subject) => {
          const config = SUBJECT_CONFIG[subject];
          const Icon = ICON_MAP[subject];
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
              <Icon
                size={12}
                style={{ "--icon-color": isSelected ? "#fff" : config.color } as React.CSSProperties}
              />
              {config.name}
            </button>
          );
        })}
      </div>
      <button
        onClick={onDismiss}
        className="w-5 h-5 rounded-full flex items-center justify-center text-[#042E5C]/30 hover:text-[#042E5C]/60 hover:bg-[#042E5C]/5 transition-all flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
