import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalLoader } from "@/components/shared/loaders/GlobalLoader";
import { TutorialVideoModal } from "@/components/shared/TutorialVideoModal";

// Every font is self-hosted from src/fonts (built by scripts/build-fonts.py), so a build never depends on reaching
// Google Fonts.

// Site-wide type: Nunito Sans for headings and body, with Mukta chained
// behind it (see globals.css) for Devanagari. The lesson screen keeps its own
// Fredoka + Nunito pairing below.
const nunitoSans = localFont({
  variable: "--font-nunito-sans",
  src: "../fonts/NunitoSans-Variable.woff2",
  weight: "200 1000",
});

const mukta = localFont({
  variable: "--font-mukta",
  src: [
    { path: "../fonts/Mukta-Regular.woff2", weight: "400" },
    { path: "../fonts/Mukta-Medium.woff2", weight: "500" },
    { path: "../fonts/Mukta-SemiBold.woff2", weight: "600" },
    { path: "../fonts/Mukta-Bold.woff2", weight: "700" },
  ],
  // Only the Devanagari fallback: fetched when a page uses it, not preloaded on every page.
  preload: false,
});

// Report Card "document" typography — distinct on purpose, loaded properly
// via next/font instead of an inline <link> that only worked on some routes.
const sourceSerif = localFont({
  variable: "--font-source-serif",
  src: "../fonts/SourceSerif4-Variable.woff2",
  weight: "200 900",
  adjustFontFallback: "Times New Roman",
  preload: false,
});

const jetbrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  src: "../fonts/JetBrainsMono-Variable.woff2",
  weight: "100 800",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "monospace"],
  preload: false,
});

// The lesson whiteboard's handwriting: annotations the tutor "writes" on the
// board. Kalam covers Devanagari too, so Hindi notes stay in the same hand.
const kalam = localFont({
  variable: "--font-kalam",
  src: [
    { path: "../fonts/Kalam-Regular.woff2", weight: "400" },
    { path: "../fonts/Kalam-Bold.woff2", weight: "700" },
  ],
  preload: false,
});

// The lesson screen's type, matched to the rounded GenEd logo: Fredoka for
// headings and controls, Nunito for reading. Both chain Mukta for Devanagari.
const fredoka = localFont({
  variable: "--font-fredoka",
  src: "../fonts/Fredoka-Variable.woff2",
  weight: "300 700",
});

const nunito = localFont({
  variable: "--font-nunito",
  src: "../fonts/Nunito-Variable.woff2",
  weight: "200 1000",
});

export const metadata: Metadata = {
  title: "GenEd",
  description: "A safe, AI-powered personalized learning platform for children.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunitoSans.variable} ${mukta.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${kalam.variable} ${fredoka.variable} ${nunito.variable} antialiased font-sans`}>
        <GlobalLoader />
        {children}
        <TutorialVideoModal />
      </body>
    </html>
  );
}
