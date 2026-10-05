import React from "react";

/**
 * A single-colour PNG glyph recoloured with CSS masking, so one icon file can
 * take whatever colour its context calls for (e.g. a subject's mastery band).
 */
export function MaskIcon({ src, color, size = 20, className = "" }: { src: string; color: string; size?: number; className?: string }) {
  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 transition-colors ${className}`}
      style={{ width: size, height: size, background: color, WebkitMask: mask, mask }}
    />
  );
}
