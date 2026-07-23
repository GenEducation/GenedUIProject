import type { Metadata } from "next";
import { Inter, Playfair_Display, Baloo_2, Mukta, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GlobalLoader } from "@/components/shared/loaders/GlobalLoader";
import { TutorialVideoModal } from "@/components/shared/TutorialVideoModal";
import Script from "next/script";

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

// Student app + onboarding + auth type system. Both cover Devanagari so
// Hindi subject/chapter content renders in-family instead of falling back.
const baloo2 = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "devanagari"],
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
      <body className={`${inter.variable} ${playfair.variable} ${baloo2.variable} ${mukta.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} antialiased font-sans`}>
        <GlobalLoader />
        {children}
        <TutorialVideoModal />
        <Script 
          src="https://checkout.razorpay.com/v1/checkout.js" 
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
