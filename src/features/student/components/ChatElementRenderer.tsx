"use client";

import React, { useEffect, useState } from "react";
import { ChatElement } from "../store/useStudentStore";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { VisualCard } from "./VisualCard";
import { VisualBlock } from "./VisualBlock";
import { P5Visual } from "./P5Visual";
import { GeoGebraVisual } from "./GeoGebraVisual";
import { MathWidget } from "./MathWidget";
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
        <div className="w-full h-32 bg-[#F0F7FF] rounded-xl animate-pulse" />
      ) : imageUrl ? (
        <img src={imageUrl} alt="Scene" className="max-w-full rounded-xl shadow-sm" />
      ) : (
        <div className="w-full p-4 bg-[#FFF8E1] text-[#F57F17] rounded-xl text-xs font-medium text-center">
          🖼️ Image unavailable
        </div>
      )}
      <p className="text-sm font-semibold text-[#042E5C]/80 text-center">{prompt}</p>
    </div>
  );
}

interface ChatElementRendererProps {
  elements: ChatElement[];
  // When true (parent history view): skips interactive-only elements
  // (comprehension_widget, english_skill_view) that require student interaction
  isReadOnly?: boolean;
}

export const ChatElementRenderer = React.memo(({ elements, isReadOnly = false }: ChatElementRendererProps) => {
  return (
    <div className="space-y-5">
      {elements.map((el) => {
        if (el.type === "text") {
          return <MarkdownRenderer key={el.id} content={el.content} />;
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
              allowRetry={isReadOnly ? false : el.meta?.allow_retry}
              disabled={isReadOnly}
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
    </div>
  );
});

ChatElementRenderer.displayName = "ChatElementRenderer";
