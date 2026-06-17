"use client";

import { motion } from "framer-motion";
import { Copy, Check, Volume2, VolumeX, Loader2 } from "lucide-react";
import Image from "next/image";
import { ChatMessage } from "../store/useStudentStore";
import React, { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useSmoothStream } from "@/hooks/useSmoothStream";
import { ActivityRenderer } from "./ActivityRenderer";
import { MessageElements } from "./MessageElements";

// ── Web Speech API TTS hook ───────────────────────────────────────────────────
type SpeakState = "idle" | "loading" | "speaking";

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/`[^`]*`/g, "")        // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → label only
    .replace(/#{1,6}\s+/g, "")      // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1")  // italic
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1") // underscore bold/italic
    .replace(/~~([^~]+)~~/g, "$1")  // strikethrough
    .replace(/^\s*[-*+]\s+/gm, "")  // unordered list bullets
    .replace(/^\s*\d+\.\s+/gm, "")  // ordered list numbers
    .replace(/^\s*>\s+/gm, "")      // blockquotes
    .replace(/\n{2,}/g, ". ")       // paragraph breaks → pause
    .replace(/\n/g, " ")
    .trim();
}

function useReadAloud(text: string) {
  const [state, setState] = React.useState<SpeakState>("idle");
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  const toggle = React.useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (state === "speaking") {
      window.speechSynthesis.cancel();
      setState("idle");
      return;
    }

    window.speechSynthesis.cancel();
    setState("loading");

    const clean = stripMarkdown(text);

    // Voices ranked by pleasantness — first match wins.
    // Ordered: neural/natural cloud voices → quality OS voices → any English.
    const VOICE_PRIORITY = [
      // Windows neural Indian English female (Win 11+)
      "Microsoft Neerja Online (Natural) - English (India)",
      "Microsoft Neerja - English (India)",
      // Chrome Indian English female
      "Google हिन्दी",      // Chrome Hindi — Indian accent
      "Google Indian English",
      // macOS Indian English
      "Lekha",             // macOS en-IN female, clear Indian accent
      "Rishi",             // macOS en-IN male fallback
      // Broader fallbacks — still prefer female
      "Google UK English Female",
      "Samantha",
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Microsoft Zira Desktop - English (United States)",
      "Google US English",
    ];

    const pickVoice = (voices: SpeechSynthesisVoice[]) => {
      for (const name of VOICE_PRIORITY) {
        const match = voices.find((v) => v.name === name);
        if (match) return match;
      }
      // Last resort: prefer en-IN female, then any English female, then any English
      return (
        voices.find((v) => v.lang === "en-IN" && v.name.toLowerCase().includes("female")) ||
        voices.find((v) => v.lang === "en-IN") ||
        voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        null
      );
    };

    const speak = (voices: SpeechSynthesisVoice[]) => {
      const utterance = new SpeechSynthesisUtterance(clean);
      // Slightly slower rate + natural pitch feels warmer and less robotic
      utterance.rate = 1.1;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      const voice = pickVoice(voices);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setState("speaking");
      utterance.onend = () => setState("idle");
      utterance.onerror = () => setState("idle");

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speak(voices);
    } else {
      // Chrome loads voices asynchronously on first call
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speak(window.speechSynthesis.getVoices());
      };
    }
  }, [state, text]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (utteranceRef.current) window.speechSynthesis?.cancel();
    };
  }, []);

  return { state, toggle };
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onOptionSelect?: (option: string) => void;
}

const SmoothMarkdown = ({ content, isStreaming }: { content: string; isStreaming: boolean }) => {
  const displayedText = useSmoothStream(content, isStreaming, 15);
  return <MarkdownRenderer content={displayedText} showToolbar={!isStreaming} />;
};

export const ChatMessageBubble = React.memo(
  ({ message, isStreaming, onOptionSelect }: ChatMessageBubbleProps) => {
    const isUser = message.sender === "user";
    const [copied, setCopied] = useState(false);

    // Apply elegant streaming buffer if this is the active streaming message
    const displayedText = useSmoothStream(message.text, !!isStreaming, 15);

    // Read-aloud via Web Speech API (AI messages only)
    const { state: speakState, toggle: toggleSpeak } = useReadAloud(message.text);

    const handleCopy = () => {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3 w-full`}
      >
        {/* AI avatar */}
        {!isUser && (
          <div className="relative flex-shrink-0 mt-0.5">
            {isStreaming && (
              <div className="absolute -inset-[3px] rounded-full border-[2px] border-transparent border-t-[#5B4DC7] border-r-[#5B4DC7]/20 animate-spin" style={{ animationDuration: '1s' }} />
            )}
            <div className="rounded-full overflow-hidden relative z-10 bg-white" style={{ border: "1px solid #E2E8F0", width: "clamp(32px, 8vw, 40px)", height: "clamp(32px, 8vw, 40px)" }}>
              <Image src="/Favicon1.jpg" alt="AI Agent" width={40} height={40} className="object-cover w-full h-full" />
            </div>
          </div>
        )}

        <div className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
          {/* Message Content Bin */}
          {(isStreaming || message.statusText || message.text.length > 0 || (message.elements && message.elements.length > 0)) && (
            <div
              className="px-4 py-3 sm:px-6 sm:py-5 leading-relaxed text-[13px] sm:text-[15px] transition-all duration-300 w-full"
              style={{
                borderRadius: "1.75rem",
                borderTopRightRadius: isUser ? 6 : undefined,
                borderTopLeftRadius: !isUser ? 6 : undefined,
                background: isUser ? "#5B4DC7" : "#FFFFFF",
                color: isUser ? "#FFFFFF" : "#1A202C",
                border: isUser ? "none" : "1px solid #E2E8F0",
                boxShadow: isUser ? "0 2px 10px rgba(91,77,199,0.18)" : "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              {message.text.length === 0 && !message.statusText && !message.elements && isStreaming ? (
                <span style={{ color: "#94A3B8", fontWeight: 500 }} className="animate-pulse">Processing...</span>
              ) : message.statusText && message.text.length === 0 && (!message.elements || message.elements.length === 0) ? (
                <span style={{ color: "#94A3B8", fontWeight: 500 }} className="animate-pulse">
                  {message.statusText}
                </span>
              ) : message.elements && message.elements.length > 0 ? (
                <MessageElements elements={message.elements} isStreaming={isStreaming} toolStatus={message.toolStatus} />
              ) : (
                <MarkdownRenderer content={displayedText} showToolbar={!isUser && !isStreaming} />
              )}

              {/* Render Activities if present */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-4">
                  {message.actions.map((action, idx) => (
                    <ActivityRenderer
                      key={`${action.activity_id}-${idx}`}
                      action={action}
                      isCompleted={!isStreaming && idx === 0 && !!(message.text && message.sender === 'ai')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 px-2">
            <span style={{ fontSize: "clamp(9px, 2vw, 11px)", fontWeight: 700, color: "#CBD5E1", textTransform: "uppercase", letterSpacing: "0.06em" }}>{message.timestamp}</span>
            {isUser && (
              <button
                onClick={handleCopy}
                style={{ width: 28, height: 28, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}
                className="transition-all hover:bg-[#F7F8FC] hover:text-[#5B4DC7]"
              >
                {copied ? <Check size={14} className="text-[#00B894]" /> : <Copy size={14} />}
              </button>
            )}
          </div>

          {/* AI message extras */}
          {!isUser && !isStreaming && (
            <div className="space-y-3 w-full px-1">
              {/* Option chips */}
              {message.options && message.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onOptionSelect?.(opt)}
                      style={{ fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 700, color: "#5B4DC7", background: "#FFFFFF", border: "1.5px solid #5B4DC720", borderRadius: 20, padding: "5px clamp(10px, 2.5vw, 14px)", cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#5B4DC7"; (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLButtonElement).style.color = "#5B4DC7"; }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Feedback row — clipboard + read aloud */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  style={{ width: 32, height: 32, borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", transition: "all 0.2s" }}
                  className="hover:bg-[#F7F8FC] hover:text-[#5B4DC7]"
                >
                  {copied ? <Check size={15} className="text-[#00B894]" /> : <Copy size={15} />}
                </button>

                {/* Read-aloud speaker button */}
                <button
                  onClick={toggleSpeak}
                  title={speakState === "speaking" ? "Stop reading" : "Read aloud"}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: speakState === "speaking" ? "#EEF0FF" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: speakState === "speaking" ? "#5B4DC7" : "#94A3B8",
                    transition: "all 0.2s",
                  }}
                  className="hover:bg-[#F7F8FC] hover:text-[#5B4DC7]"
                >
                  {speakState === "loading" ? (
                    <Loader2 size={15} className="animate-spin text-[#5B4DC7]" />
                  ) : speakState === "speaking" ? (
                    <VolumeX size={15} />
                  ) : (
                    <Volume2 size={15} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

ChatMessageBubble.displayName = "ChatMessageBubble";

