import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans, Mukta, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
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
      <body className={`${inter.variable} ${playfair.variable} ${jakarta.variable} ${mukta.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} antialiased font-sans`}>
        <GlobalLoader />
        {children}
        <TutorialVideoModal />
      </body>
    </html>
  );
}
