import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans, Mukta, Source_Serif_4, JetBrains_Mono, Kalam, Fredoka, Nunito } from "next/font/google";
import "./globals.css";
// Blobatar's motion layer. Required — an `animate` prop renders inline SVG but
// nothing moves without this stylesheet. `gaze.css` arms the cursor-tracking
// layer; it registers `--mo-track-travel` at 0px, so every blobatar still
// holds still until something sets an excursion.
import "blobatar/motion.css";
import "blobatar/gaze.css";
import { GlobalLoader } from "@/components/shared/loaders/GlobalLoader";
import { TutorialVideoModal } from "@/components/shared/TutorialVideoModal";

// Inter + Playfair back the out-of-scope teacher/parent/lab portals (see
// .portal-legacy-type in globals.css) — kept even though the student app
// no longer uses them directly.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

// Student app + onboarding + auth type system. Jakarta is Latin-only, so
// --font-display chains Mukta behind it (see globals.css) to keep Devanagari
// headings in-family for Hindi subject/chapter content.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

// Report Card "document" typography — distinct on purpose, loaded properly
// via next/font instead of an inline <link> that only worked on some routes.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// The lesson whiteboard's handwriting: annotations the tutor "writes" on the
// board. Kalam covers Devanagari too, so Hindi notes stay in the same hand.
const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
});

// The lesson screen's type, matched to the rounded GenEd logo: Fredoka for
// headings and controls, Nunito for reading. Both chain Mukta for Devanagari.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      <body className={`${inter.variable} ${playfair.variable} ${jakarta.variable} ${mukta.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${kalam.variable} ${fredoka.variable} ${nunito.variable} antialiased font-sans`}>
        <GlobalLoader />
        {children}
        <TutorialVideoModal />
      </body>
    </html>
  );
}
