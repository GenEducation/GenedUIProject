import Image from "next/image";

/**
 * The GenEd brand mark, in one place.
 *
 * - `full` — the cap-and-sparkle "GenEd" wordmark (transparent PNG, deep ocean).
 * - `mark` — the square cap + sparkle tile, for icon-sized slots (collapsed
 *   rails, avatars, the tab icon's twin).
 *
 * `onDark` knocks the wordmark out to white for dark grounds.
 */
const WORDMARK = { src: "/brand/gened-logo-deep-ocean-transparent.png", width: 354, height: 140 };
const MARK = { src: "/brand/gened-mark.svg", width: 64, height: 64 };

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
  const asset = variant === "mark" ? MARK : WORDMARK;
  const width = Math.round((asset.width / asset.height) * height);
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{
        height,
        width: "auto",
        filter: onDark && variant === "full" ? "brightness(0) invert(1)" : undefined,
      }}
    />
  );
}
