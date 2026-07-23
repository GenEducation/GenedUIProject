"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { ChatMessage } from "../store/useStudentStore";
import { MessageElements } from "./MessageElements";

interface VoiceTranscriptProps {
  messages: ChatMessage[];
  agentName: string;
}

// How close to the bottom (px) counts as "still following the conversation".
const NEAR_BOTTOM_THRESHOLD = 48;

export function VoiceTranscript({ messages, agentName }: VoiceTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Auto-scroll only while the student hasn't deliberately scrolled up to
  // read earlier turns — previously every new message force-scrolled to the
  // bottom unconditionally, yanking the view away mid-read.
  const [followLatest, setFollowLatest] = useState(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setFollowLatest(distanceFromBottom <= NEAR_BOTTOM_THRESHOLD);
  };

  const lastText = messages[messages.length - 1]?.text;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !followLatest) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastText, followLatest]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white/70 backdrop-blur-sm px-3 sm:px-5 py-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Mic size={22} style={{ color: "var(--tutor)", opacity: 0.2 }} />
            <p
              className="text-[15px] font-extrabold"
              style={{ color: "var(--primary-ink)", fontFamily: "var(--font-display)" }}
            >
              Listening…
            </p>
            <p className="text-[12px]" style={{ color: "rgba(4,46,92,0.4)" }}>
              Say hello to get started — your conversation appears here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              const label = isUser ? "You" : agentName;
              const color = isUser ? "var(--primary-ink)" : "var(--tutor)";
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
                <div
                  key={m.id}
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    // Light per-sender tint + alignment so a turn is
                    // scannable at a glance, instead of two label colors
                    // being the only difference between speakers.
                    background: isUser ? "rgba(4,46,92,0.04)" : "rgba(91,77,199,0.04)",
                    marginLeft: isUser ? "10%" : 0,
                    marginRight: isUser ? 0 : "10%",
                  }}
                >
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
                    <div className="pl-[56px] mt-1">
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
