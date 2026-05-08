"use client";

import { ReactNode } from "react";
import { AuthHeader } from "./AuthHeader";
import { AuthHero } from "./AuthHero";
import { AuthFeatures } from "./AuthFeatures";
import { AuthFooter } from "./AuthFooter";

interface AuthPageLayoutProps {
  children: ReactNode;
  title: ReactNode;
  subtitle: string;
}

export function AuthPageLayout({ children, title, subtitle }: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-[#0E1F2B] font-sans selection:bg-[#059F6D]/15 selection:text-[#0E1F2B]">
      <AuthHeader />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:px-16">
        <div className="w-full max-w-7xl rounded-[3rem] bg-white shadow-[0_40px_100px_rgba(45,85,64,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-[#2D5540]/5">
          <AuthHero />

          <section className="p-8 sm:p-10 lg:p-14 flex items-center justify-center bg-white relative">
            {/* Emerald ambient glow */}
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#059F6D]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#042e5c] tracking-tight font-serif">
                  {title}
                </h2>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#042e5c]/60">
                  {subtitle}
                </p>
              </div>

              {children}
            </div>
          </section>
        </div>
      </div>
      <AuthFeatures />
      <AuthFooter />
    </div>
  );
}
