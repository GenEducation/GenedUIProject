import React, { useEffect, useRef, useState } from "react";
import { getP5Source } from "@/utils/p5Loader";

interface P5VisualProps {
  code: string;
}

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

  function updateScale() {
    const container = document.getElementById('canvas-container');
    const canvas = document.querySelector('canvas');
    if (!container || !canvas) return;
    
    // Get the base dimensions defined in the sketch
    const w = canvas.width;
    const h = canvas.height;
    
    if (w === 0 || h === 0) return;

    const scaleX = window.innerWidth / w;
    const scaleY = window.innerHeight / h;
    
    // Use 0.8 multiplier to ensure a generous "Safe Zone" for animations
    const scale = Math.min(scaleX, scaleY) * 0.8;
    
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

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
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
