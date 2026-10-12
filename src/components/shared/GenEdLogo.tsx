import Image from "next/image";

/**
 * The GenEd brand mark, in one place.
 *
 * - `full` — the cap-and-sparkle "GenEd" wordmark (transparent PNG, deep ocean).
 * - `mark` — the star-and-hat icon (the favicon's artwork, transparent), for
 *   icon-sized slots: collapsed rails, avatars, pop-ups.
 *
 * `onDark` knocks the wordmark out to white, and swaps the mark for its
 * light-coloured variant, for dark grounds.
 */
const WORDMARK = { src: "/brand/gened-logo-deep-ocean-transparent.png", width: 354, height: 140 };
const MARK = { src: "/brand/gened-star.png", width: 256, height: 256 };
const MARK_ON_DARK = { src: "/brand/gened-star-on-dark.png", width: 256, height: 256 };

interface GenEdLogoProps {
  /** Rendered height in px; width follows the asset's aspect ratio. */
  height?: number;
  variant?: "full" | "mark";
  onDark?: boolean;
  priority?: boolean;
  className?: string;
  alt?: string;
}

export function GenEdLogo({
  height = 36,
  variant = "full",
  onDark = false,
  priority = false,
  className,
  alt = "GenEd",
}: GenEdLogoProps) {
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
