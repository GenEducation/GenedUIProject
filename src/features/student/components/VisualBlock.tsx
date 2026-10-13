import { FigureView } from './FigureView';

interface VisualBlockProps {
  svg?: string;
  image?: string;
  /** Loose tutor-supplied metadata; only these fields are read. */
  meta?: { source?: string; figure_id?: string; shape?: string; [key: string]: unknown };
}

export const VisualBlock: React.FC<VisualBlockProps> = ({ svg, image, meta }) => {
  const isShowFigure = meta?.source === "show_figure" && meta?.figure_id;

  return (
    <div
      className="my-3 overflow-hidden"
      style={{
        background: "#FBFBF8",
        border: "1px solid #E3E8E2",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 1px 6px rgba(7,94,99,0.05)",
      }}
    >
      {isShowFigure ? (
        <FigureView uuid={isShowFigure} />
      ) : image ? (
        <div className="w-full flex justify-center items-center">
          <img
            src={image}
            alt={meta?.figure_id || "Visual Figure"}
            className="max-w-full h-auto rounded-xl object-contain"
            style={{ boxShadow: "0 2px 12px rgba(18,45,48,0.08)" }}
          />
        </div>
      ) : svg ? (
        <div
          className="w-full h-auto flex justify-center items-center svg-container"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}

      {meta?.shape && (
        <div
          style={{
            marginTop: 8, textAlign: "center",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#7F9295",
            fontFamily: "var(--font-body)",
          }}
        >
          {meta.shape.replace(/_/g, ' ')}
        </div>
      )}

      <style jsx global>{`
        .svg-container svg {
          max-width: 100%;
          height: auto;
          display: block;
        }
      `}</style>
    </div>
  );
};
