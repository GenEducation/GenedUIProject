import { FigureView } from './MarkdownRenderer';

interface VisualBlockProps {
  svg?: string;
  image?: string;
  meta?: any;
}

export const VisualBlock: React.FC<VisualBlockProps> = ({ svg, image, meta }) => {
  const isShowFigure = meta?.source === "show_figure" && meta?.figure_id;

  return (
    <div 
      className="my-4 p-4 bg-white rounded-2xl border border-[#1a3a2a]/10 shadow-sm overflow-hidden"
      style={{ maxWidth: '100%' }}
    >
      {isShowFigure ? (
        <FigureView uuid={meta.figure_id} />
      ) : image ? (
        <div className="w-full flex justify-center items-center">
          <img 
            src={image} 
            alt={meta?.figure_id || "Visual Figure"} 
            className="max-w-full h-auto rounded-xl object-contain shadow-sm"
          />
        </div>
      ) : svg ? (
        <div 
          className="w-full h-auto flex justify-center items-center svg-container"
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      ) : null}

      {meta?.shape && (
        <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#1a3a2a]/20 text-center">
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
