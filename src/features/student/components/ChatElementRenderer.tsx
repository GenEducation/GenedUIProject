"use client";

import React, { useEffect, useState } from "react";
import { ChatElement } from "../store/useStudentStore";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { VisualBlock } from "./VisualBlock";
import { FigureView } from "./FigureView";
import { P5Visual } from "./P5Visual";
import { GeoGebraVisual } from "./GeoGebraVisual";
import { MathWidget } from "./MathWidget";
import { ComprehensionWidget } from "./ComprehensionWidget";
import { KaraokeRenderer } from "./KaraokeRenderer";
import { InteractiveBlock } from "./interactive/InteractiveBlock";

import { useStudentStore } from "../store/useStudentStore";
import type { PointerSpec } from "./pdf-viewer/pointerGeometry";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Clickable callout that activates the PDF pointer — same as the live SSE "pointer" event. */
function PointerRefCallout({ text, textEnd, label, page }: {
  text: string;
  textEnd?: string;
  label?: string;
  page?: number;
}) {
  const setPointer = useStudentStore((s) => s.setPointer);

  const handleClick = () => {
    const spec: PointerSpec = {
      page,
      label,
      target: { kind: "text", text, textEnd },
    };
    setPointer(spec);
  };

  const snippet = textEnd ? `${text} … ${textEnd}` : text;

  return (
    <button
      onClick={handleClick}
      title="Click to highlight in textbook"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        background: "linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)",
        border: "1.5px solid #BFDBFE",
        borderLeft: "4px solid #1A6BBF",
        borderRadius: 10,
        padding: "10px 14px",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "linear-gradient(135deg, #DBEAFE 0%, #E0F2FE 100%)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 2px 8px rgba(26,107,191,0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {/* Pin icon */}
      <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <p style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            color: "#1A6BBF",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 2,
            fontFamily: "var(--font-body)",
          }}>
            {label}
          </p>
        )}
        <p style={{
          margin: 0,
          fontSize: 13,
          color: "#334155",
          fontStyle: "italic",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-body)",
        }}>
          &ldquo;{snippet}&rdquo;
        </p>
      </div>

      {/* CTA */}
      <span style={{
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 600,
        color: "#1A6BBF",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-body)",
      }}>
        View in textbook →
      </span>
    </button>
  );
}


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
      <p className="text-sm font-semibold text-[var(--primary-ink)]/80 text-center">{prompt}</p>
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
          // Frameless, matching MessageElements — no card, badge or caption, so
          // the visual reads as part of the message.
          if (el.meta?.engine === "p5sketch") {
            return <P5Visual key={el.id} code={el.meta.code || ""} />;
          }
          if (el.meta?.engine === "geogebra") {
            return (
              <GeoGebraVisual key={el.id} id={el.id} commands={el.meta.commands || []} options={el.meta.options} />
            );
          }
          if (el.meta?.engine === "desmos") {
            return (
              <MathWidget
                key={el.id}
                expression={el.meta.options?.expression || el.meta.code || ""}
                meta={el.meta.options}
                minimal={true}
              />
            );
          }
          if (el.meta?.engine === "show_figure") {
            // Live turns carry the figure as inline base64/data-URI in `image`. History
            // turns only persist the `figure_id` reference, which must be fetched via
            // FigureView's authenticated endpoint (see VisualBlock for the same pattern).
            const imgSource = el.meta.image?.startsWith('data:')
              ? el.meta.image
              : (el.meta.image && !el.meta.figure_id ? `data:image/jpeg;base64,${el.meta.image}` : null);
            return (
              <div key={el.id} className="flex flex-col items-start">
                {el.meta.figure_id ? (
                  <FigureView uuid={el.meta.figure_id} />
                ) : imgSource ? (
                  <img src={imgSource} alt={el.meta.label || "Figure"} className="max-w-full sm:max-w-[480px] h-auto rounded-xl" />
                ) : (
                  <div className="bg-[#FFF8E1] text-[#F57F17] px-3 py-2 rounded-lg text-xs font-medium">📐 Figure ID: unknown</div>
                )}
              </div>
            );
          }
          if (el.meta?.engine === "show_figure_describe") {
            return (
              <div key={el.id} className="flex flex-col items-start gap-3">
                <FigureDescribeBlock
                  figureAssetUrl={el.meta.figure_asset_url}
                  prompt={el.meta.label || "What do you see in this picture?"}
                  directiveId={el.meta.directive_id}
                />
              </div>
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
        if (el.type === "interactive") {
          return (
            <InteractiveBlock
              key={el.id}
              directiveId={el.meta?.directive_id || el.id}
              meta={el.meta}
              disabled={isReadOnly}
              readOnly={isReadOnly}
            />
          );
        }

        if (el.type === "pointer_ref") {
          return (
            <PointerRefCallout
              key={el.id}
              text={el.content}
              textEnd={el.meta?.text_end}
              label={el.meta?.label}
              page={el.meta?.page}
            />
          );
        }

        return null;
      })}
    </div>
  );
});

ChatElementRenderer.displayName = "ChatElementRenderer";
