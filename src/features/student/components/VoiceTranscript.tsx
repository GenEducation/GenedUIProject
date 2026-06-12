"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "../store/useStudentStore";
import { MessageElements } from "./MessageElements";

interface VoiceTranscriptProps {
  messages: ChatMessage[];
  agentName: string;
}

export function VoiceTranscript({ messages, agentName }: VoiceTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastText = messages[messages.length - 1]?.text;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastText]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white/70 backdrop-blur-sm px-5 py-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {messages.length === 0 ? (
          <p className="text-center text-[13px] text-[#94A3B8] italic py-10">
            The conversation will appear here as you speak…
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m) => {
              const label = m.sender === "user" ? "You" : agentName;
              const color = m.sender === "user" ? "#042E5C" : "#5B4DC7";
              const text = (m.text || "").trim();
              const hasElements = m.elements && m.elements.length > 0;
              // History messages carry the transcript as interleaved text *elements*
              // (from parseContent) and render those. Live messages keep the whole
              // transcript in `text` with visual-only elements — so render the plain text
              // span whenever the elements don't already include the text, keeping the
              // font consistent and the text unbroken when a visual is present.
              const hasTextElements = !!m.elements?.some((el) => el.type === "text");
              const showPlainText = !!text && !hasTextElements;
              if (!text && !hasElements) return null;
              return (
                <div key={m.id} className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 text-[14px] leading-relaxed">
                    <span
                      className="font-extrabold tracking-wide uppercase text-[10px] mt-1 min-w-[44px]"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    {showPlainText && <span className="text-[#1A202C] flex-1">{text}</span>}
                  </div>
                  {hasElements && (
                    <div className="pl-[56px]">
                      <MessageElements elements={m.elements!} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
