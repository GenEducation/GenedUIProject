"use client";

export function AuthHeader() {
  return (
    <header className="flex items-center justify-between px-8 py-5 lg:px-16 lg:py-6 border-b border-[#042e5c]/6 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <img src="/Logo.svg" alt="GenEd" className="h-6 w-auto" />
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.25em] text-[#042e5c]/40">
          The Scholarly Sanctuary
        </span>
      </div>
    </header>
  );
}
