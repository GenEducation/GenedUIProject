import localFont from "next/font/local";

// The Zoovi marketing pages' own type, self-hosted like the rest of the app
// (built by scripts/build-fonts.py). Young Serif carries the headlines — warm,
// round, a little bookish; Onest is the clean reading face. Kalam (the hand-
// written notes) is already loaded site-wide as --font-kalam.
export const youngSerif = localFont({
  variable: "--zv-font-display",
  src: "../../fonts/YoungSerif-Regular.woff2",
  weight: "400",
  display: "swap",
});

export const onest = localFont({
  variable: "--zv-font-body",
  src: "../../fonts/Onest-Variable.woff2",
  weight: "100 900",
  display: "swap",
});

export const marketingFontVars = `${youngSerif.variable} ${onest.variable}`;
