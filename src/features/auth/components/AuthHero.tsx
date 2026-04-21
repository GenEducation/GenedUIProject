"use client";

export function AuthHero() {
  return (
    <section className="relative bg-[#042e5c] p-10 lg:p-14 flex flex-col justify-between gap-10 min-h-[650px] overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient glow — Emerald */}
      <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] bg-[#059F6D] opacity-[0.08] rounded-full blur-3xl pointer-events-none" />
      {/* Ambient glow — Teal */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#4EB6BF] opacity-[0.05] rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="space-y-8 relative z-10 flex flex-col items-center lg:items-start">
        {/* Favicon — kept as-is, animation removed per audit */}
        <div className="flex justify-center lg:justify-start w-full">
          <div className="rounded-full bg-white/10 p-4 ring-1 ring-white/20 shadow-xl shadow-black/30">
            <img
              src="/Favicon1.jpg"
              alt="GenEd favicon"
              className="h-28 w-28 rounded-full object-cover"
            />
          </div>
        </div>

        {/* Hero heading — Playfair Display serif per audit */}
        <div className="space-y-5 relative z-10 mx-auto lg:mx-0 text-left max-w-md">
          <h1 className="text-4xl lg:text-5xl tracking-tight text-white leading-[1.1] font-serif">
            <span className="block text-white/50 text-2xl lg:text-3xl font-normal italic mb-2">
              Step into your
            </span>
            <span className="block font-extrabold text-white">Scholarly</span>
            <span className="block font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#059F6D] via-[#2dcfab] to-[#4EB6BF]">
              Sanctuary
            </span>
          </h1>
          <p className="text-sm font-medium leading-relaxed text-white/45 max-w-xs">
            An AI-powered teacher with voice and chat assistance for the next generation of learners.
          </p>
        </div>
      </div>

      {/* Bottom rule + badge */}
      <div className="relative z-10 mt-auto">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
            GenEd Platform
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>
    </section>
  );
}
