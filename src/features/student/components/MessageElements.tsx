"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ChatElement } from "../store/useStudentStore";
import { VisualBlock } from "./VisualBlock";
import { MathWidget } from "./MathWidget";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useSmoothStream } from "@/hooks/useSmoothStream";
import { VisualCard } from "./VisualCard";
import { FigureView } from "./FigureView";
import { P5Visual } from "./P5Visual";
import { GeoGebraVisual } from "./GeoGebraVisual";
import { ComprehensionWidget } from "./ComprehensionWidget";
import { KaraokeRenderer } from "./KaraokeRenderer";
import { InteractiveBlock } from "./interactive/InteractiveBlock";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

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
        <img src={imageUrl} alt="Scene" className="max-w-full rounded-xl" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)", maxHeight: "60vh", objectFit: "contain" }} />
      ) : (
        <div className="w-full p-3 sm:p-4 rounded-xl text-[10px] sm:text-xs font-medium text-center" style={{ background: "#FFF8E1", color: "#D4820A" }}>
          🖼️ Image unavailable
        </div>
      )}
      <p style={{ fontSize: 13, fontWeight: 700, color: "#4A5568", textAlign: "center" }}>{prompt}</p>
    </div>
  );
}

const StreamingTextRenderer = React.memo(
  ({ content, isStreaming, index, advance }: { content: string; isStreaming: boolean; index: number; advance: (i: number) => void }) => {
    const displayedText = useSmoothStream(content, isStreaming, 15);
    const advancedRef = useRef(false);

    useEffect(() => {
      if (!advancedRef.current && content.length > 0 && displayedText.length >= content.length) {
        advancedRef.current = true;
        advance(index);
      }
    }, [displayedText, content, advance, index]);

    return <MarkdownRenderer content={displayedText} showToolbar={!isStreaming} />;
  }
);
StreamingTextRenderer.displayName = "StreamingTextRenderer";

// Gates a non-text element (visual/widget/card) behind the sequential reveal
// order: mounts with a fade-in, then signals the sequence to advance after a
// short beat so the next element's turn begins.
function RevealGate({ index, advance, delayMs = 400, children }: {
  index: number;
  advance: (i: number) => void;
  delayMs?: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => advance(index), delayMs);
    return () => clearTimeout(timeout);
  }, [advance, index, delayMs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

// Renders a single element's content, without a key or reveal wrapper —
// the caller (MessageElements) attaches the key and, for non-text elements,
// the RevealGate.
function renderElementNode(el: ChatElement): React.ReactNode {
  if (el.type === "visual") {
    if (el.content === "error") {
      return (
        <div className="bg-[#FFF8E1] text-[#F57F17] px-3 py-2 rounded-lg text-xs font-medium self-center my-2">
           📐 Visual unavailable — {el.meta?.label || "Visual"}
        </div>
      );
    }
    if (el.meta?.engine === "p5sketch") {
      return (
        <VisualCard engine="p5sketch" label={el.meta.label || ""}>
          <P5Visual code={el.meta.code || ""} />
        </VisualCard>
      );
    }
    if (el.meta?.engine === "geogebra") {
      return (
        <VisualCard engine="geogebra" label={el.meta.label || ""}>
          <GeoGebraVisual id={el.id} commands={el.meta.commands || []} options={el.meta.options} />
        </VisualCard>
      );
    }
    if (el.meta?.engine === "desmos") {
      return (
        <VisualCard engine="desmos" label={el.meta.label || "Graph"}>
          <MathWidget expression={el.meta.options?.expression || el.meta.code || ""} meta={el.meta.options} minimal={true} />
        </VisualCard>
      );
    }
    // show_figure renders a base64 figure from the textbook. The backend tags the
    // payload engine as "image" (route_visual show_figure → engine:"image"); older
    // payloads used "show_figure". Handle both so the figure isn't silently dropped.
    if (el.meta?.engine === "show_figure" || el.meta?.engine === "image") {
      // Live turns carry the figure as inline base64/data-URI in `image`. History
      // turns only persist the `figure_id` reference, which must be fetched via
      // FigureView's authenticated endpoint (see VisualBlock for the same pattern).
      const imgSource = el.meta.image?.startsWith('data:')
        ? el.meta.image
        : (el.meta.image && !el.meta.figure_id ? `data:image/jpeg;base64,${el.meta.image}` : null);
      return (
        <VisualCard engine="show_figure" label={el.meta.label || ""}>
          <div className="flex flex-col items-center">
            {el.meta.figure_id ? (
              <FigureView uuid={el.meta.figure_id} />
            ) : imgSource ? (
              <img src={imgSource} alt={el.meta.label || "Figure"} className="max-w-full rounded-lg" />
            ) : (
              <div className="bg-[#FFF8E1] text-[#F57F17] px-3 py-2 rounded-lg text-xs font-medium">📐 Figure ID: unknown</div>
            )}
          </div>
        </VisualCard>
      );
    }
    if (el.meta?.engine === "show_figure_describe") {
      return (
        <VisualCard engine="show_figure" label="Picture Description">
          <div className="flex flex-col items-center gap-3">
            <FigureDescribeBlock
              figureAssetUrl={el.meta.figure_asset_url}
              prompt={el.meta.label || "What do you see in this picture?"}
              directiveId={el.meta.directive_id}
            />
          </div>
        </VisualCard>
      );
    }
    return null;
  }
  if (el.type === "svg") return <VisualBlock svg={el.content} meta={el.meta} />;
  if (el.type === "image") return <VisualBlock image={el.content} meta={el.meta} />;
  if (el.type === "widget") return <MathWidget expression={el.content} meta={el.meta} />;
  if (el.type === "comprehension_widget") {
    return (
      <ComprehensionWidget
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
  // "english_skill_view" is handled separately in MessageElements — it types
  // its passage out smoothly and drives its own reveal-advance, rather than
  // using this function's fixed-delay RevealGate.
  if (el.type === "interactive") {
    return (
      <InteractiveBlock
        directiveId={el.meta?.directive_id || el.id}
        meta={el.meta}
      />
    );
  }
  return null;
}

interface MessageElementsProps {
  elements: ChatElement[];
  isStreaming?: boolean;
  toolStatus?: string;
}

export function MessageElements({ elements, isStreaming, toolStatus }: MessageElementsProps) {
  // Whether this message was actively streaming when it first mounted. Captured
  // once (lazy initializer) so historical (already-complete) messages always
  // reveal instantly, while live messages reveal their elements in strict
  // sequential order regardless of later isStreaming changes.
  const [wasStreaming] = useState(() => !!isStreaming);

  const [revealedCount, setRevealedCount] = useState(() => (wasStreaming ? 0 : Number.POSITIVE_INFINITY));

  // Only the element whose turn it currently is may advance the sequence —
  // guards against stale/duplicate reveal signals firing out of order.
  const advance = useCallback((i: number) => {
    setRevealedCount((r) => (i === r ? r + 1 : r));
  }, []);

  const visibleElements = useMemo(
    () => (wasStreaming ? elements.slice(0, Math.min(revealedCount + 1, elements.length)) : elements),
    [elements, wasStreaming, revealedCount]
  );

  return (
    <div className="space-y-5">
      {visibleElements.map((el, index) => {
        if (el.type === "text") {
          return (
            <StreamingTextRenderer
              key={el.id}
              content={el.content}
              isStreaming={wasStreaming}
              index={index}
              advance={advance}
            />
          );
        }

        if (el.type === "english_skill_view") {
          return (
            <motion.div
              key={el.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <KaraokeRenderer
                text={el.content}
                directiveId={el.meta?.directive_id || ""}
                mode={el.meta?.mode}
                isStreaming={wasStreaming}
                index={index}
                advance={advance}
              />
            </motion.div>
          );
        }

        const node = renderElementNode(el);
        if (node === null) return null;

        return (
          <RevealGate key={el.id} index={index} advance={advance}>
            {node}
          </RevealGate>
        );
      })}
      {toolStatus && isStreaming && (
        <div className="flex items-center gap-3 animate-pulse mt-3" style={{ padding: "10px 16px", background: "#5B4DC708", border: "1px solid #5B4DC715", borderRadius: 16, fontSize: 12, fontWeight: 700, color: "#5B4DC7" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00B894", animation: "bounce 1s infinite" }} />
          {toolStatus}
        </div>
      )}
    </div>
  );
}
