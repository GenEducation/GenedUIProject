import localFont from "next/font/local";

// Self-hosted from src/fonts (built by scripts/build-fonts.py), so a build never depends on reaching Google Fonts.
const display = localFont({
  src: [
    { path: "../../fonts/Fraunces-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "../../fonts/Fraunces-Italic-Variable.woff2", weight: "100 900", style: "italic" },
  ],
  adjustFontFallback: "Times New Roman",
  variable: "--gc-font-display",
});
const body = localFont({ src: "../../fonts/Manrope-Variable.woff2", weight: "200 800", variable: "--gc-font-body" });
// The product's own fonts, so the film's mock screens look like the app.
const app = localFont({ src: "../../fonts/NunitoSans-Variable.woff2", weight: "200 1000", variable: "--gc-font-app" });
const fredoka = localFont({ src: "../../fonts/Fredoka-Variable.woff2", weight: "300 700", variable: "--gc-font-fredoka" });
const nunito = localFont({ src: "../../fonts/Nunito-Variable.woff2", weight: "200 1000", variable: "--gc-font-nunito" });
const kalam = localFont({
  src: [
    { path: "../../fonts/Kalam-Regular.woff2", weight: "400" },
    { path: "../../fonts/Kalam-Bold.woff2", weight: "700" },
  ],
  variable: "--gc-font-kalam",
});

/** Class names that define every campaign font variable. */
export const FONT_VARS = [display, body, app, fredoka, nunito, kalam].map((f) => f.variable).join(" ");
