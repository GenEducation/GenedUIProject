"use client";

import { ChevronLeft } from "lucide-react";
import { useTeacherStore } from "../store/useTeacherStore";
import { TeacherSessionList } from "./TeacherSessionList";
import { TeacherChatHistoryView } from "./TeacherChatHistoryView";

export function TeacherChatExploration() {
  const { activeSessionId, closeSession } = useTeacherStore();

  return (
    <div className="flex flex-1 overflow-hidden bg-paper">
      <div className={`h-full ${activeSessionId ? "hidden md:flex" : "flex w-full md:w-auto"}`}>
        <TeacherSessionList />
      </div>

      <div className={`h-full flex-1 flex-col ${activeSessionId ? "flex" : "hidden md:flex"}`}>
        {activeSessionId && (
          <button
            onClick={closeSession}
            className="flex items-center gap-1.5 border-b border-border p-3.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ink md:hidden"
          >
            <ChevronLeft size={16} />
            Back to sessions
          </button>
        )}
        <TeacherChatHistoryView />
      </div>
    </div>
  );
}
