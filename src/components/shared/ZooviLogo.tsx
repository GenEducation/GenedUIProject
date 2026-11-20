import Image from "next/image";

/**
 * The Zoovi brand mark, in one place.
 *
 * - `full` — the Zoovi wordmark (the logo's green, lime and yellow paper letters, transparent PNG).
 * - `mark` — the logo's "z" on its own (also the favicon's artwork), for icon-sized slots: collapsed rails,
 *   avatars, pop-ups.
 *
 * `onDark` knocks the wordmark out to white, and sets the mark on a paper tile, for dark grounds.
 */
const WORDMARK = { src: "/brand/zoovi-logo.png", width: 1063, height: 365 };
const MARK = { src: "/brand/zoovi-mark.png", width: 256, height: 256 };
const MARK_ON_DARK = { src: "/brand/zoovi-mark-on-dark.png", width: 256, height: 256 };

/**
 * How far below the wordmark's box centre its letters' centre sits, at a given rendered height (px). The "i" dot and
 * a little air above the letters make the image top-heavy, so a control centred beside the logo looks too high;
 * nudge it down by this much to line it up with the letters.
 */
export const wordmarkLetterOffset = (height: number) => Math.round(height * ((114 + 347) / 2 / 365 - 0.5));

interface ZooviLogoProps {
  /** Rendered height in px; width follows the asset's aspect ratio. */
  height?: number;
  variant?: "full" | "mark";
  onDark?: boolean;
  priority?: boolean;
  className?: string;
  alt?: string;
}

export function ZooviLogo({
  height = 36,
  variant = "full",
  onDark = false,
  priority = false,
  className,
  alt = "Zoovi",
}: ZooviLogoProps) {
  const asset = variant === "mark" ? (onDark ? MARK_ON_DARK : MARK) : WORDMARK;
  const width = Math.round((asset.width / asset.height) * height);
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      draggable={false}
      className={className}
      style={{
        height,
        width: "auto",
        filter: onDark && variant === "full" ? "brightness(0) invert(1)" : undefined,
      }}
    />
  );
}
