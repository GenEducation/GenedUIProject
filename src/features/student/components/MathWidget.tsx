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

  // Use srcDoc with the Desmos API to embed the graph with the provided expression
  const desmosHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
      <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        #calculator { width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div id="calculator"></div>
      <script>
        var elt = document.getElementById('calculator');
        var calculator = Desmos.GraphingCalculator(elt, {
          expressions: false,
          settingsMenu: false,
          zoomButtons: false
        });
        calculator.setExpression({ id: 'graph1', latex: ${JSON.stringify(expression)} });
      </script>
    </body>
    </html>
  `;

  return (
    <div className="my-4 rounded-2xl border border-[#1a3a2a]/10 shadow-sm overflow-hidden bg-white group">
      <div className="relative">
        <iframe
          srcDoc={desmosHtml}
          className="w-full h-[350px] border-none"
          title="Desmos Graph"
          sandbox="allow-scripts allow-same-origin"
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
