import React, { useEffect, useRef, useState } from "react";
import { getP5Source } from "@/utils/p5Loader";

interface P5VisualProps {
  code: string;
}

/** Used until the sketch reports its real canvas size. */
const DEFAULT_ASPECT = 16 / 10;

/**
 * How large a visual is allowed to draw.
 *
 * The sketch's own `createCanvas(w, h)` comes from the backend and fixes only
 * the PROPORTIONS — these two caps decide the size on screen. Kept well under
 * the text column so a sketch reads as a figure inside the message rather than
 * a full-width panel; whichever cap binds first wins, so a wide sketch is
 * limited by the width and a tall one by the height.
 */
const MAX_WIDTH = 480;
const MAX_HEIGHT = 340;

function sanitizeSketchCode(code: string): string {
  const dangerous = [
    /\bfetch\s*\(/g,
    /\bXMLHttpRequest\b/g,
    /\bWebSocket\b/g,
    /\beval\s*\(/g,
    /\bdocument\.cookie\b/g,
    /\blocalStorage\b/g,
    /\bsessionStorage\b/g,
    /\bwindow\.parent\b/g,
    /\btop\b\s*\[/g,
  ];
  let sanitized = code;
  dangerous.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "/* blocked */");
  });
  return sanitized;
}

export function P5Visual({ code }: P5VisualProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // The sketch's own proportions, reported out of the iframe, so the container
  // hugs the canvas instead of letterboxing it inside a fixed band.
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // The frame is sandboxed without allow-same-origin, so its origin is the
      // opaque string "null" — identity of the source window is the only
      // meaningful check here.
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data;
      if (!data || data.type !== "p5-canvas-size") return;
      const { w, h } = data;
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
      setAspect((current) => (current === w / h ? current : w / h));
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadP5() {
      try {
        const p5Source = await getP5Source();
        if (!isMounted) return;

        const sanitizedCode = sanitizeSketchCode(code);
        const escapedP5 = p5Source.replace(/<\/script>/gi, '<\\/script>');
        const escapedCode = sanitizedCode.replace(/<\/script>/gi, '<\\/script>');

        const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    background: transparent; 
    overflow: hidden; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    width: 100vw; 
    height: 100vh; 
    margin: 0;
    padding: 0;
  }
  #canvas-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform-origin: center center;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  canvas { 
    display: block; 
  }
</style>
</head>
<body>
<div id="canvas-container"></div>
<script>
  ${escapedP5}
</script>
<script>
  // Intercept createCanvas to put it in our container
  const _origCreateCanvas = window.createCanvas;
  window.createCanvas = function(w, h, renderer) {
    const canvas = _origCreateCanvas(w, h, renderer);
    canvas.parent('canvas-container');
    // Force a re-scale once the canvas is created
    setTimeout(updateScale, 10);
    return canvas;
  };

  var _reported = '';

  function updateScale() {
    const container = document.getElementById('canvas-container');
    const canvas = document.querySelector('canvas');
    if (!container || !canvas) return;

    // CSS pixels, NOT canvas.width/height. p5 sets pixelDensity from the
    // device pixel ratio, so on a HiDPI screen the backing buffer is 2x (or
    // 1.25x, or 3x) the size the sketch asked for. Scaling against that
    // inflated number shrank every sketch by 1/dpr and left a fat margin
    // around it.
    const w = canvas.offsetWidth || canvas.width;
    const h = canvas.offsetHeight || canvas.height;

    if (w === 0 || h === 0) return;

    // Tell the host the sketch's real proportions so it can size its box to
    // match. Re-sent whenever the sketch resizes its own canvas.
    if (_reported !== w + 'x' + h) {
      _reported = w + 'x' + h;
      try { parent.postMessage({ type: 'p5-canvas-size', w: w, h: h }, '*'); } catch (e) {}
    }

    const scaleX = window.innerWidth / w;
    const scaleY = window.innerHeight / h;
    
    // Small safe zone so animations that overshoot the canvas edge are not clipped.
    const scale = Math.min(scaleX, scaleY) * 0.9;
    
    container.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  }

  window.addEventListener('resize', updateScale);
  setInterval(updateScale, 200);

  ${escapedCode}
</script>
</body>
</html>
        `;
        setSrcdoc(html);
      } catch (err) {
        console.error("Failed to render p5 sketch", err);
      }
    }

    loadP5();

    return () => {
      isMounted = false;
    };
  }, [code]);

  const ratio = aspect ?? DEFAULT_ASPECT;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        // Both caps expressed as a width — a max-height on an aspect-ratio box
        // makes the rendered width and height disagree.
        width: `min(100%, ${MAX_WIDTH}px, ${Math.round(MAX_HEIGHT * ratio)}px)`,
        aspectRatio: String(ratio),
      }}
    >
      {loading && (
        <div className="absolute inset-0 z-10" style={{ background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }}>
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}
      {srcdoc && (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          scrolling="no"
          srcDoc={srcdoc}
          onLoad={() => setLoading(false)}
          className="w-full h-full border-none transition-opacity duration-300"
          style={{
            opacity: loading ? 0 : 1,
            pointerEvents: "auto",
          }}
        />
      )}
    </div>
  );
}
