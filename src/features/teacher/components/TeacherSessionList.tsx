"use client";

import { MessageSquare, ChevronRight, Loader2 } from "lucide-react";
import { useTeacherStore } from "../store/useTeacherStore";
import { subjectColor } from "../constants";

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function TeacherSessionList() {
  const { chats, activeSessionId, openSession, isFetchingChats } = useTeacherStore();

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-white md:w-80">
      <div className="flex-none border-b border-border px-5 py-4">
        <h3 className="font-serif text-base font-semibold text-ink">Recent sessions</h3>
        <p className="mt-0.5 text-[12px] text-muted">Open a session to read the tutoring transcript.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isFetchingChats ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-border bg-paper py-10 text-center text-[13px] text-muted-light">
            No recent learning sessions yet.
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((session) => {
              const date = formatDate(session.last_active || session.updated_at);
              const isActive = activeSessionId === session.session_id;
              const color = subjectColor(session.subject);
              return (
                <button
                  key={session.session_id}
                  onClick={() => openSession(session.session_id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-ink bg-ink text-white shadow-md"
                      : "border-border hover:bg-paper"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,.12)" : `${color}22`,
                      color: isActive ? "#fff" : color,
                    }}
                  >
                    <MessageSquare size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[13px] font-semibold ${isActive ? "text-white" : "text-ink"}`}>
                      {session.title || session.subject || "Learning session"}
                    </span>
                    <span className={`block text-[11.5px] ${isActive ? "text-white/70" : "text-muted"}`}>
                      {[session.subject, date, session.message_count ? `${session.message_count} messages` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight size={16} className={`flex-none ${isActive ? "text-white/60" : "text-muted-light"}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
