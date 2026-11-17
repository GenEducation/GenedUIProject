/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";

interface VisualPlaceholderProps {
  /** What belongs here — the doc's note for the visual. */
  note: string;
  /** The image, once it arrives. Until then the frame stays empty. */
  src?: string;
  ratio?: string;
  kind?: "image" | "video";
  className?: string;
  style?: CSSProperties;
}

/**
 * An empty, labelled frame where a product visual will go. Pass `src` when the
 * asset arrives and it fills the same frame.
 */
export function VisualPlaceholder({ note, src, ratio = "4 / 3", kind = "image", className, style }: VisualPlaceholderProps) {
  return (
    <figure
      className={`zv-visual${src ? " zv-visual--filled" : ""}${className ? ` ${className}` : ""}`}
      style={{ aspectRatio: ratio, ...style }}
      data-kind={kind}
    >
      {src ? (
        <img src={src} alt={note} />
      ) : (
        <figcaption className="zv-visual__note">
          <span className="zv-visual__icon" aria-hidden="true">
            {kind === "video" ? (
              <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" /></svg>
            )}
          </span>
          <span className="zv-visual__kind">{kind === "video" ? "Video" : "Visual"}</span>
          <span className="zv-visual__text">{note}</span>
        </figcaption>
      )}
    </figure>
  );
}
