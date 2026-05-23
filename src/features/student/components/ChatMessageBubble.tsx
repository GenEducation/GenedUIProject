"use client";

import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import Image from "next/image";
import { ChatMessage } from "../store/useStudentStore";
import React, { useState, useEffect } from "react";
import { VisualBlock } from "./VisualBlock";
import { MathWidget } from "./MathWidget";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useSmoothStream } from "@/hooks/useSmoothStream";

import { VisualCard } from "./VisualCard";
import { P5Visual } from "./P5Visual";
import { GeoGebraVisual } from "./GeoGebraVisual";
import { ActivityRenderer } from "./ActivityRenderer";
import { ComprehensionWidget } from "./ComprehensionWidget";
import { KaraokeRenderer } from "./KaraokeRenderer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

// ── Mode 5: Picture Description Block ────────────────────────────────────────
function FigureDescribeBlock({ figureAssetUrl, prompt, directiveId }: {
  figureAssetUrl?: string; prompt: string; directiveId?: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!figureAssetUrl) { setLoading(false); return; }
    // If it's a relative path (signed URL endpoint), fetch it
    const resolvedUrl = figureAssetUrl.startsWith("http")
      ? figureAssetUrl
      : `${API_BASE_URL}${figureAssetUrl}`;
    fetch(resolvedUrl, { credentials: "include" })
      .then((r) => r.ok ? r.blob() : Promise.reject())
      .then((blob) => setImageUrl(URL.createObjectURL(blob)))
      .catch(() => setImageUrl(null))
      .finally(() => setLoading(false));
  }, [figureAssetUrl]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {loading ? (
        <div className="w-full h-32 rounded-xl animate-pulse" style={{ background: "#F0EEFF" }} />
      ) : imageUrl ? (
        <img src={imageUrl} alt="Scene" className="max-w-full rounded-xl" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }} />
      ) : (
        <div className="w-full p-4 rounded-xl text-xs font-medium text-center" style={{ background: "#FFF8E1", color: "#D4820A" }}>
          🖼️ Image unavailable
        </div>
      )}
      <p style={{ fontSize: 13, fontWeight: 700, color: "#4A5568", textAlign: "center" }}>{prompt}</p>
    </div>
  );
}

const StreamingTextRenderer = React.memo(({ content, isStreaming }: { content: string, isStreaming: boolean }) => {
  const displayedText = useSmoothStream(content, isStreaming, 15);
  return <MarkdownRenderer content={displayedText} showToolbar={!isStreaming} />;
});

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
            <div className="w-10 h-10 rounded-full overflow-hidden relative z-10 bg-white" style={{ border: "1px solid #E2E8F0" }}>
              <Image src="/Favicon1.jpg" alt="AI Agent" width={40} height={40} className="object-cover" />
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
                <div className="space-y-5">
                  {message.elements.map((el, index) => {
                    if (el.type === "text") {
                      const isLastElement = index === message.elements!.length - 1;
                      return <StreamingTextRenderer key={el.id} content={el.content} isStreaming={!!isStreaming && isLastElement} />;
                    }
                    if (el.type === "visual") {
                      if (el.content === "error") {
                        return (
                          <div key={el.id} className="bg-[#FFF8E1] text-[#F57F17] px-3 py-2 rounded-lg text-xs font-medium self-center my-2">
                             📐 Visual unavailable — {el.meta?.label || "Visual"}
                          </div>
                        );
                      }
                      if (el.meta?.engine === "p5sketch") {
                        return (
                          <VisualCard key={el.id} engine="p5sketch" label={el.meta.label || ""}>
                            <P5Visual code={el.meta.code || ""} />
                          </VisualCard>
                        );
                      }
                      if (el.meta?.engine === "geogebra") {
                        return (
                          <VisualCard key={el.id} engine="geogebra" label={el.meta.label || ""}>
                            <GeoGebraVisual id={el.id} commands={el.meta.commands || []} options={el.meta.options} />
                          </VisualCard>
                        );
                      }
                      if (el.meta?.engine === "desmos") {
                        return (
                          <VisualCard key={el.id} engine="desmos" label={el.meta.label || "Graph"}>
                            <MathWidget expression={el.meta.options?.expression || el.meta.code || ""} meta={el.meta.options} minimal={true} />
                          </VisualCard>
                        );
                      }
                      if (el.meta?.engine === "show_figure") {
                        const imgSource = el.meta.image?.startsWith('data:') ? el.meta.image : (el.meta.image ? `data:image/jpeg;base64,${el.meta.image}` : null);
                        return (
                          <VisualCard key={el.id} engine="show_figure" label={el.meta.label || ""}>
                            <div className="flex flex-col items-center">
                              {imgSource ? (
                                <img src={imgSource} alt={el.meta.label || "Figure"} className="max-w-full rounded-lg" />
                              ) : (
                                <div className="bg-[#FFF8E1] text-[#F57F17] px-3 py-2 rounded-lg text-xs font-medium">📐 Figure ID: {el.meta.figure_id || "unknown"}</div>
                              )}
                            </div>
                          </VisualCard>
                        );
                      }
                      if (el.meta?.engine === "show_figure_describe") {
                        return (
                          <VisualCard key={el.id} engine="show_figure" label="Picture Description">
                            <div className="flex flex-col items-center gap-3">
                              <FigureDescribeBlock
                                key={el.id}
                                figureAssetUrl={el.meta.figure_asset_url}
                                prompt={el.meta.label || "What do you see in this picture?"}
                                directiveId={el.meta.directive_id}
                              />
                            </div>
                          </VisualCard>
                        );
                      }
                    }
                    if (el.type === "svg") return <VisualBlock key={el.id} svg={el.content} meta={el.meta} />;
                    if (el.type === "image") return <VisualBlock key={el.id} image={el.content} meta={el.meta} />;
                    if (el.type === "widget") return <MathWidget key={el.id} expression={el.content} meta={el.meta} />;
                    if (el.type === "comprehension_widget") {
                      return (
                        <ComprehensionWidget
                          key={el.id}
                          directiveId={el.meta?.directive_id || el.id}
                          widgetType={el.meta?.widget_type || "free_response"}
                          question={el.meta?.question}
                          choices={el.meta?.choices}
                          allowRetry={el.meta?.allow_retry}
                          word={el.meta?.word}
                          syllables={el.meta?.syllables}
                          phonetic={el.meta?.phonetic}
                          slowAvailable={el.meta?.slow_available}
                        />
                      );
                    }
                    if (el.type === "english_skill_view") {
                      return (
                        <KaraokeRenderer
                          key={el.id}
                          text={el.content}
                          directiveId={el.meta?.directive_id || ""}
                          mode={el.meta?.mode}
                        />
                      );
                    }
                    return null;
                  })}
                  {message.toolStatus && isStreaming && (
                    <div className="flex items-center gap-3 animate-pulse mt-3" style={{ padding: "10px 16px", background: "#5B4DC708", border: "1px solid #5B4DC715", borderRadius: 16, fontSize: 12, fontWeight: 700, color: "#5B4DC7" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00B894", animation: "bounce 1s infinite" }} />
                      {message.toolStatus}
                    </div>
                  )}
                </div>
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
                      style={{ fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 700, color: "#5B4DC7", background: "#FFFFFF", border: "1.5px solid #5B4DC720", borderRadius: 20, padding: "5px 14px", cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#5B4DC7"; (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLButtonElement).style.color = "#5B4DC7"; }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Feedback row — clipboard only */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  style={{ width: 32, height: 32, borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", transition: "all 0.2s" }}
                  className="hover:bg-[#F7F8FC] hover:text-[#5B4DC7]"
                >
                  {copied ? <Check size={15} className="text-[#00B894]" /> : <Copy size={15} />}
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

