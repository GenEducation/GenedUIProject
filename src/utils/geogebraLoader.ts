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
