"use client";
import { ZooviLogo } from "@/components/shared/ZooviLogo";

export function AuthHeader() {
  return (
    <header className="flex items-center justify-between px-8 py-5 lg:px-16 lg:py-6 border-b border-[#1D6315]/6 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <ZooviLogo height={36} priority />
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.25em] text-[#1D6315]/40">
          Personalized AI learning for curious young minds
        </span>
      </div>
    </header>
  );
}
