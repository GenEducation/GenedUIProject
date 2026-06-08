"use client";

import React, { useState, useEffect } from "react";
import { ChatElement } from "../store/useStudentStore";
import { VisualBlock } from "./VisualBlock";
import { MathWidget } from "./MathWidget";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useSmoothStream } from "@/hooks/useSmoothStream";
import { VisualCard } from "./VisualCard";
import { P5Visual } from "./P5Visual";
import { GeoGebraVisual } from "./GeoGebraVisual";
import { ComprehensionWidget } from "./ComprehensionWidget";
import { KaraokeRenderer } from "./KaraokeRenderer";

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

interface MessageElementsProps {
  elements: ChatElement[];
  isStreaming?: boolean;
  toolStatus?: string;
}

export function MessageElements({ elements, isStreaming, toolStatus }: MessageElementsProps) {
  return (
    <div className="space-y-5">
      {elements.map((el, index) => {
        if (el.type === "text") {
          const isLastElement = index === elements.length - 1;
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
      {toolStatus && isStreaming && (
        <div className="flex items-center gap-3 animate-pulse mt-3" style={{ padding: "10px 16px", background: "#5B4DC708", border: "1px solid #5B4DC715", borderRadius: 16, fontSize: 12, fontWeight: 700, color: "#5B4DC7" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00B894", animation: "bounce 1s infinite" }} />
          {toolStatus}
        </div>
      )}
    </div>
  );
}
