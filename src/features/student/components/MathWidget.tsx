import React, { useEffect, useRef, useState } from 'react';
import { splitExpressions, contentBounds } from '../utils/desmosPayload';

interface MathWidgetProps {
  expression: string;
  meta?: any;
  minimal?: boolean;
}

/**
 * Builds the sandboxed Desmos page.
 *
 * Three things in here exist to fix graphs that silently rendered as an empty
 * grid, and they are all worth keeping:
 *
 * 1. The payload is SPLIT before it is drawn. `setExpression` accepts exactly
 *    one expression; the tutor routinely sends a comma-separated list (twenty
 *    circles for "count the coconuts"). Passing the whole list as one latex
 *    string made Desmos reject it — silently, with no error and no callback —
 *    so the graph looked like it never arrived.
 * 2. The viewport is FITTED to what was drawn. The calculator used to be built
 *    before the iframe had its final size; Desmos holds its zoom while the box
 *    grows around it, which is how a graph ended up spanning -300..300. Circles
 *    of radius 0.3 sitting at x=2..5 were then drawn sub-pixel — present, but
 *    invisible.
 * 3. Failures are REPORTED to the host via postMessage — but only failures we
 *    can actually observe (see the note beside `report(true)` below). A blocked
 *    CDN or an empty payload shows a message; anything else is assumed to have
 *    worked, because guessing wrong here hides a graph that drew fine.
 */
function buildDesmosHtml(expression: string): string {
  // JSON.stringify does not escape "</script>", which would otherwise close the
  // tag early and drop the rest of the harness on the floor.
  const rawLiteral = JSON.stringify(expression).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #calculator { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="calculator"></div>
  <script>
    var RAW = ${rawLiteral};

    function report(ok, message) {
      try { parent.postMessage({ type: 'desmos-status', ok: ok, message: message }, '*'); } catch (e) {}
    }

    // Injected from ../utils/desmosPayload — see the note there. Bound to these
    // names explicitly so a minified build (which may rename the originals)
    // still resolves the calls below.
    var splitExpressions = ${splitExpressions.toString()};
    var contentBounds = ${contentBounds.toString()};

    function start() {
      if (typeof Desmos === 'undefined') {
        report(false, 'The graphing library could not be loaded.');
        return;
      }

      var elt = document.getElementById('calculator');
      var calculator = Desmos.GraphingCalculator(elt, {
        expressions: false,
        settingsMenu: false,
        zoomButtons: false
      });

      var exprs = splitExpressions(RAW);
      if (exprs.length === 0) {
        report(false, 'Nothing to plot.');
        return;
      }

      try {
        exprs.forEach(function (latex, i) {
          calculator.setExpression({ id: 'expr-' + i, latex: latex });
        });
      } catch (e) {
        report(false, 'This graph could not be drawn.');
        return;
      }

      var bounds = contentBounds(exprs);
      if (bounds) {
        calculator.setMathBounds(bounds);
      } else {
        calculator.setMathBounds({ left: -10, right: 10, bottom: -10, top: 10 });
      }

      // Deliberately NOT inspecting calculator.expressionAnalysis to decide
      // whether the plot worked. Measured against the live API (v1.9): it stays
      // an empty object and its observer never fires, whether the expressions
      // list is shown or hidden. Treating that silence as "nothing plotted"
      // replaced perfectly good graphs with an error card seconds after they
      // had visibly drawn.
      //
      // So success is the default, and only the failures we can actually
      // observe are reported: the library not loading, an empty payload, or a
      // throw while setting expressions. The cost is that latex Desmos refuses
      // to plot shows an empty grid rather than a message — worse diagnostics,
      // but it never hides a working graph.
      report(true);
    }

    var script = document.createElement('script');
    script.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
    script.onload = start;
    script.onerror = function () { report(false, 'The graphing library could not be loaded.'); };
    document.head.appendChild(script);
  </script>
</body>
</html>`;
}

export const MathWidget: React.FC<MathWidgetProps> = ({ expression, meta, minimal = false }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setFailure(null);
  }, [expression]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // srcDoc frames report an opaque origin, so the source window is the only
      // meaningful thing to check against.
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data;
      if (!data || data.type !== 'desmos-status') return;
      setFailure(data.ok ? null : (typeof data.message === 'string' ? data.message : 'This graph could not be drawn.'));
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const errorMessage = meta?.error ? (meta.message as string | undefined) : failure;

  if (meta?.error || failure) {
    return (
      <div className={`my-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-800 text-sm ${minimal ? 'm-0' : ''}`}>
        <div className="font-black text-[10px] uppercase tracking-tighter mb-1 opacity-50">Interactive graph unavailable</div>
        <div className="font-mono bg-white/50 p-2 rounded border border-red-200/50 break-all">
          {expression}
        </div>
        {errorMessage && <div className="mt-2 text-[11px] italic opacity-70">{errorMessage}</div>}
      </div>
    );
  }

  const desmosHtml = buildDesmosHtml(expression);

  if (minimal) {
    return (
      <div className="w-full relative">
        <iframe
          ref={iframeRef}
          srcDoc={desmosHtml}
          className="w-full max-w-[480px] h-[340px] border-none"
          title="Desmos Graph"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  return (
    <div className="my-4 rounded-2xl border border-[#1a3a2a]/10 shadow-sm overflow-hidden bg-white group">
      <div className="relative">
        <iframe
          ref={iframeRef}
          srcDoc={desmosHtml}
          className="w-full h-[350px] border-none"
          title="Desmos Graph"
          sandbox="allow-scripts allow-same-origin"
        />
        {/* Overlay to catch clicks if needed or just styling */}
        <div className="absolute inset-0 pointer-events-none border border-[#1a3a2a]/5 rounded-2xl" />
      </div>
      <div className="px-4 py-2 bg-[#1a3a2a]/5 flex justify-between items-center gap-3">
        <span className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest shrink-0">
          Interactive Graph
        </span>
        <span className="text-[10px] font-mono text-[#1a3a2a]/60 font-bold truncate">
          {expression}
        </span>
      </div>
    </div>
  );
};
