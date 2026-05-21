import { FigureView } from './FigureView';

interface VisualBlockProps {
  svg?: string;
  image?: string;
  meta?: any;
}

export const VisualBlock: React.FC<VisualBlockProps> = ({ svg, image, meta }) => {
  const isShowFigure = meta?.source === "show_figure" && meta?.figure_id;

  return (
    <div
      className="my-3 overflow-hidden"
      style={{
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 1px 6px rgba(91,77,199,0.05)",
      }}
    >
      {isShowFigure ? (
        <FigureView uuid={meta.figure_id} />
      ) : image ? (
        <div className="w-full flex justify-center items-center">
          <img
            src={image}
            alt={meta?.figure_id || "Visual Figure"}
            className="max-w-full h-auto rounded-xl object-contain"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
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
            textTransform: "uppercase", color: "#94A3B8",
            fontFamily: "'DM Sans', sans-serif",
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
