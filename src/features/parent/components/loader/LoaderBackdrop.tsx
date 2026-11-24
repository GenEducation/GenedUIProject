/**
 * The soft backdrop behind the "one moment" screens (BrandLoadingScreen, and the plain screen while a route checks
 * the session): the portal background with lime, citron and yellow washes and a few faint stars.
 */
export function LoaderBackdrop({ animated = false }: { animated?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: "#F8F9EF" }}>
      <div className="absolute -top-40 right-[12%] h-[460px] w-[460px] rounded-full bg-[#C9E88A]/45 blur-[90px]" />
      <div className="absolute left-[-120px] top-[40%] h-[380px] w-[380px] rounded-full bg-[#D4E98A]/35 blur-[90px]" />
      <div className="absolute bottom-[-140px] right-[28%] h-[420px] w-[420px] rounded-full bg-[#FBEA9A]/40 blur-[100px]" />
      {[
        [12, 22], [22, 70], [36, 14], [64, 82], [78, 26], [88, 64], [52, 90], [8, 52],
      ].map(([left, top], i) => (
        <span
          key={i}
          className={`absolute h-1 w-1 rounded-full bg-[#1D6315]/25 ${animated ? "motion-safe:animate-pulse" : ""}`}
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </div>
  );
}
