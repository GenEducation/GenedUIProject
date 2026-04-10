"use client";

export function AuthHero() {
  return (
    <section className="relative bg-[#F2F2E9] p-10 lg:p-14 flex flex-col justify-between gap-10 min-h-[650px] overflow-hidden">
      {/* Subtle decorative background element */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2D5540]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-8 relative z-10 flex flex-col items-center lg:items-start">
        <div className="flex justify-center lg:justify-start w-full">
          <div
            className="rounded-full bg-white/95 p-4 shadow-xl shadow-[#0E1F2B]/10 ring-1 ring-[#2D5540]/10"
            style={{ animation: "faviconRotate 3s ease-in-out infinite" }}
          >
            <img
              src="/favicon1.jpg"
              alt="GenEd favicon"
              className="h-28 w-28 rounded-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-4 relative z-10 mx-auto lg:mx-0 text-left max-w-md">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0E1F2B] leading-[1.05]">
            <span className="block text-[#042e5c]">Step into</span>
            <span className="block text-[#042e5c]">your Scholarly</span>
            <span className="block bg-gradient-to-r from-[#2D5540] via-[#50B4A8] to-[#4EB6BF] text-transparent bg-clip-text">
              Sanctuary
            </span>
          </h1>
          <p className="mt-3 text-lg font-semibold leading-relaxed text-[#2D3E51]/82 text-center lg:text-left">
            An AI powered teacher with both voice and chat assistance.
          </p>
        </div>
      </div>

      {/* <style jsx>{`
        @keyframes faviconRotate {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-15deg);
          }
          75% {
            transform: rotate(15deg);
          }
        }
      `}</style> */}
    </section>
  );
}
