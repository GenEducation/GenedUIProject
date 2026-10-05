import React from "react";

/**
 * Placeholder for portal content that's still loading: a pale glass shape
 * with a slow diagonal light sweep (still under reduced motion). Size and
 * radius come from `className`, so it can mirror the real element's shape.
 */
export function GlassSkeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className={`relative block overflow-hidden rounded-lg border border-white/70 bg-[#E4F5EE]/70 ${className}`}
    >
      <span className="absolute inset-y-0 -left-full w-[200%] bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.75)_50%,transparent_65%)] motion-safe:animate-[shimmer_1.8s_ease-in-out_infinite]" />
    </span>
  );
}
