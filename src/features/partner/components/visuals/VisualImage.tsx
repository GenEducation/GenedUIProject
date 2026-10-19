"use client";

import { useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { visualsService } from "../../services/visualsService";

interface VisualImageProps {
  imageUrl: string | null;
  alt: string;
  /**
   * Signed image URLs expire within 15 minutes. Called on the first load
   * error only, so the caller can refetch for a fresh URL; later errors just
   * keep the placeholder rather than looping.
   */
  onExpired?: () => void;
  className?: string;
  imgClassName?: string;
}

/**
 * A visual's picture: a plain `<img>` on the signed public path, no auth
 * header. Keeps the 4:3 frame whether or not there is an image to show.
 */
export function VisualImage({ imageUrl, alt, onExpired, className = "", imgClassName = "" }: VisualImageProps) {
  const refetched = useRef(false);
  // The URL that failed. Show the placeholder until a refetch hands back a
  // different one: the same URL would never fire another error, leaving the
  // browser's broken-image glyph on screen.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = visualsService.imageSrc(imageUrl);
  const broken = !src || failedSrc === src;

  const handleError = () => {
    setFailedSrc(src);
    if (!refetched.current && onExpired) {
      refetched.current = true;
      onExpired();
    }
  };

  return (
    <div className={`relative aspect-[4/3] w-full bg-[#F4F6F4] overflow-hidden ${className}`}>
      {broken ? (
        <div
          data-testid="visual-image-placeholder"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#1A3D2C]/30"
        >
          <ImageOff size={28} strokeWidth={1.5} />
          <span className="text-[10px] font-black uppercase tracking-widest">Image unavailable</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived API path; next/image would cache past expiry
        <img
          src={src}
          alt={alt}
          onError={handleError}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-contain ${imgClassName}`}
        />
      )}
    </div>
  );
}
