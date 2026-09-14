/**
 * The slice of the GeoGebra applet API this app uses. `deployggb.js` is loaded
 * from a <script> tag and installs `GGBApplet` on `window` with no ambient type
 * declarations, so only the members called here are declared.
 */
export interface GeoGebraApi {
  setPerspective(layout: string): void;
  setAxesVisible(x: boolean, y: boolean): void;
  setGridVisible(visible: boolean): void;
  evalCommand(command: string): void;
  zoomAll(): void;
  remove(): void;
}

/**
 * Applet parameters. The documented ones this app sets are named; the index
 * signature covers the caller-supplied `options` spread in on top of them.
 */
export interface GeoGebraAppletParameters {
  appName?: string;
  width?: number;
  height?: number;
  showToolBar?: boolean;
  showMenuBar?: boolean;
  showAlgebraInput?: boolean;
  enableRightClick?: boolean;
  showResetIcon?: boolean;
  preventFocus?: boolean;
  scaleContainerClass?: string;
  showAxes?: boolean;
  showGrid?: boolean;
  appletOnLoad?: (api: GeoGebraApi) => void;
  [key: string]: unknown;
}

export interface GeoGebraApplet {
  inject(containerId: string): void;
}

export type GGBAppletConstructor = new (
  parameters: GeoGebraAppletParameters,
  html5NoWebSimple?: boolean
) => GeoGebraApplet;

/** The applet constructor deployggb.js installs on `window`, once loaded. */
export function getGGBApplet(): GGBAppletConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { GGBApplet?: GGBAppletConstructor }).GGBApplet;
}

let geogebraLoadPromise: Promise<void> | null = null;
let isGeogebraLoaded = false;

export async function ensureGeoGebraLoaded(): Promise<void> {
  if (isGeogebraLoaded) return;
  if (geogebraLoadPromise) return geogebraLoadPromise;

  geogebraLoadPromise = new Promise((resolve, reject) => {
    // If it's already in the DOM somehow
    if (document.querySelector('script[src="https://www.geogebra.org/apps/deployggb.js"]')) {
      isGeogebraLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.geogebra.org/apps/deployggb.js";
    script.async = true;
    script.onload = () => {
      isGeogebraLoaded = true;
      resolve();
    };
    script.onerror = (err) => {
      console.error("Failed to load GeoGebra script", err);
      geogebraLoadPromise = null;
      reject(err);
    };
    document.body.appendChild(script);
  });

  return geogebraLoadPromise;
}
