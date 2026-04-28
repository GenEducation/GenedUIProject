import React from 'react';

interface MathWidgetProps {
  expression: string;
  meta?: any;
}

export const MathWidget: React.FC<MathWidgetProps> = ({ expression, meta }) => {
  if (meta?.error) {
    return (
      <div className="my-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-800 text-sm">
        <div className="font-black text-[10px] uppercase tracking-tighter mb-1 opacity-50">Interactive graph unavailable</div>
        <div className="font-mono bg-white/50 p-2 rounded border border-red-200/50">
          {expression}
        </div>
        {meta.message && <div className="mt-2 text-[11px] italic opacity-70">{meta.message}</div>}
      </div>
    );
  }

  // Basic Desmos embedding. For a more robust solution, use the Desmos API.
  const desmosUrl = `https://www.desmos.com/calculator?expression=${encodeURIComponent(expression)}`;

  return (
    <div className="my-4 rounded-2xl border border-[#1a3a2a]/10 shadow-sm overflow-hidden bg-white group">
      <div className="relative">
        <iframe
          src={desmosUrl}
          className="w-full h-[350px] border-none"
          title="Desmos Graph"
        />
        {/* Overlay to catch clicks if needed or just styling */}
        <div className="absolute inset-0 pointer-events-none border border-[#1a3a2a]/5 rounded-2xl" />
      </div>
      <div className="px-4 py-2 bg-[#1a3a2a]/5 flex justify-between items-center">
        <span className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">
          Interactive Graph
        </span>
        <span className="text-[10px] font-mono text-[#1a3a2a]/60 font-bold">
          {expression}
        </span>
      </div>
    </div>
  );
};
