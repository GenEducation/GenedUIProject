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
  body { background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
  canvas { display: block; }
</style>
</head>
<body>
<script>
  ${escapedP5}
</script>
<script>
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

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !srcdoc) return;

    const handleLoad = () => {
      setLoading(false);
      
      // Auto-scale logic
      if (containerRef.current) {
        const sketchWidth = 400; // standard convention from prompt
        const containerWidth = containerRef.current.offsetWidth;
        if (containerWidth > 0 && containerWidth < sketchWidth) {
          const scale = containerWidth / sketchWidth;
          iframe.style.transform = `scale(${scale})`;
          iframe.style.transformOrigin = "top left";
          iframe.style.width = `${sketchWidth}px`;
          // We don't shrink the iframe height, we just let it scale visual
          iframe.style.height = `${320 / scale}px`;
        }
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [srcdoc]);

  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center overflow-hidden">
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
          className="transition-opacity duration-300"
          style={{
            width: "100%",
            height: "320px",
            border: "none",
            background: "transparent",
            opacity: loading ? 0 : 1,
          }}
        />
      )}
    </div>
  );
}
