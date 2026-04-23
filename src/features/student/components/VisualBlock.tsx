import React from 'react';

interface VisualBlockProps {
  svg: string;
  meta?: any;
}

export const VisualBlock: React.FC<VisualBlockProps> = ({ svg, meta }) => {
  return (
    <div 
      className="my-4 p-4 bg-white rounded-2xl border border-[#1a3a2a]/10 shadow-sm overflow-hidden"
      style={{ maxWidth: '100%' }}
    >
      <div 
        className="w-full h-auto flex justify-center items-center svg-container"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
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
