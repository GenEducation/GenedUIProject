import React, { useEffect, useRef, useState } from "react";
import { ensureGeoGebraLoaded } from "@/utils/geogebraLoader";

interface GeoGebraVisualProps {
  id: string;
  commands: string[];
  options?: any;
}

export function GeoGebraVisual({ id, commands, options = {} }: GeoGebraVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const containerId = `ggb-${id.replace(/[^a-zA-Z0-9]/g, "-")}`;

  useEffect(() => {
    let apiInstance: any = null;
    let isMounted = true;

    async function loadApplet() {
      try {
        await ensureGeoGebraLoaded();
        if (!isMounted) return;

        const params = {
          appName: "classic",
          width: 600, // Applet width will scale down via CSS 100% or GeoGebra handles it
          height: 320,
          showToolBar: false,
          showMenuBar: false,
          showAlgebraInput: false,
          enableRightClick: false,
          showResetIcon: false,
          preventFocus: true,
          scaleContainerClass: 'geogebra-container',
          ...options,
          appletOnLoad: (api: any) => {
            if (!isMounted) {
               api.remove();
               return;
            }
            apiInstance = api;
            
            // Force Geometry perspective (Graphics view only, no algebra/tools panel)
            api.setPerspective("G");
            
            // Hide axes and grid by default unless options explicitly request them
            const showAxes = options.showAxes === true;
            const showGrid = options.showGrid === true;
            api.setAxesVisible(showAxes, showAxes);
            api.setGridVisible(showGrid);

            if (commands && commands.length > 0) {
              commands.forEach((cmd) => {
                try {
                  api.evalCommand(cmd);
                } catch (e) {
                  console.error("GeoGebra evalCommand error:", cmd, e);
                }
              });
            }
            setLoading(false);
          },
        };

        // @ts-ignore
        const applet = new window.GGBApplet(params, true);
        applet.inject(containerId);
      } catch (err) {
        console.error("Failed to load GeoGebra applet", err);
        if (isMounted) setLoading(false);
      }
    }

    loadApplet();

    return () => {
      isMounted = false;
      if (apiInstance) {
        try {
          apiInstance.remove();
        } catch (e) {
          console.error("Error removing GeoGebra instance:", e);
        }
      }
    };
  }, [commands, options, containerId]);

  return (
    <div className="w-full min-h-[260px] relative flex items-center justify-center overflow-hidden geogebra-container">
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
      <div id={containerId} className="w-full h-full" style={{ opacity: loading ? 0 : 1, transition: "opacity 300ms" }} />
    </div>
  );
}
