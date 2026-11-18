import Image from "next/image";

/** The Zoovi wordmark (folded-paper greens and yellow, transparent PNG). */
const WORDMARK = { src: "/brand/zoovi-logo.png", width: 1063, height: 365 };

interface ZooviLogoProps {
  /** Rendered height in px; width follows the artwork's aspect ratio. */
  height?: number;
  priority?: boolean;
  className?: string;
}

export function ZooviLogo({ height = 34, priority = false, className }: ZooviLogoProps) {
  const width = Math.round((WORDMARK.width / WORDMARK.height) * height);
  return (
    <Image
      src={WORDMARK.src}
      alt="Zoovi"
      width={width}
      height={height}
      priority={priority}
      loading={priority ? "eager" : undefined}
      draggable={false}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
