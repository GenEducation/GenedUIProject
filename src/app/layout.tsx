import type { Metadata } from "next";
import { Inter, Playfair_Display, Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { GlobalLoader } from "@/components/shared/loaders/GlobalLoader";
import { SiteTutorial } from "@/components/shared/SiteTutorial";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
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
      <body className={`${inter.variable} ${playfair.variable} ${spaceGrotesk.variable} ${plusJakarta.variable} antialiased font-sans`}>
        <GlobalLoader />
        {children}
        <SiteTutorial />
        <Script 
          src="https://checkout.razorpay.com/v1/checkout.js" 
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
