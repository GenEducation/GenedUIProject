"use client";

import { User, Loader2, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useTeacherStore } from "../store/useTeacherStore";
import { parseContent } from "@/features/student/utils/parseContent";
import { ChatElementRenderer } from "@/features/student/components/ChatElementRenderer";
import { ChatMessage } from "../services/teacherService";

function isStudent(message: ChatMessage) {
  const role = (message.role || "").toLowerCase();
  return role === "user" || role === "student";
}

export function TeacherChatHistoryView() {
  const { activeSessionId, chatMessages, isFetchingMessages } = useTeacherStore();

  if (!activeSessionId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-paper p-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white text-muted-light shadow-sm">
          <MessageCircle size={30} />
        </div>
        <h3 className="font-serif text-xl font-semibold text-ink">Select a session</h3>
        <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-muted">
          Choose a session from the list to read the tutoring transcript.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-paper">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 md:px-12">
          {isFetchingMessages ? (
            <div className="flex items-center justify-center py-20 text-muted-light">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-[13px] text-muted-light">
              <MessageCircle className="mx-auto mb-2 text-muted-light" size={28} />
              No messages found for this session.
            </div>
          ) : (
            chatMessages.map((message, i) => {
              const fromStudent = isStudent(message);
              return (
                <div
                  key={message.message_id || i}
                  className={`flex items-start gap-3 w-full ${fromStudent ? "flex-row-reverse justify-start" : "justify-start"}`}
                >
                  {!fromStudent && (
                    <div className="mt-0.5 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-border bg-white">
                      <Image src="/Favicon1.jpg" alt="AI Tutor" width={40} height={40} className="h-full w-full object-cover" />
                    </div>
                  )}
                  {fromStudent && (
                    <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald text-white">
                      <User size={16} />
                    </div>
                  )}
                  <div
                    className="max-w-[85%] px-4 py-3 text-[13px] leading-relaxed sm:px-6 sm:py-5 sm:text-[15px]"
                    style={{
                      borderRadius: "1.75rem",
                      borderTopRightRadius: fromStudent ? 6 : undefined,
                      borderTopLeftRadius: !fromStudent ? 6 : undefined,
                      background: fromStudent ? "#059F6D" : "#FFFFFF",
                      color: fromStudent ? "#FFFFFF" : "#042E5C",
                      border: fromStudent ? "none" : "1px solid #e6ecf2",
                      boxShadow: fromStudent ? "0 2px 10px rgba(5,159,109,0.18)" : "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    {fromStudent ? (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    ) : (
                      <ChatElementRenderer elements={parseContent(message.content || "")} isReadOnly />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
