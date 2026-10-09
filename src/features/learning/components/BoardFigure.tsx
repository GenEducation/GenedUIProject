"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { picturesFor, useLessonStore } from "../useLessonStore";
import { altTextOf, figureGroupsOf } from "../figures";

/**
 * One presented figure, large on the board, with its caption in the board's
 * hand. Signed URLs expire: on a load error the manifest is refreshed once.
 * A figure from an earlier step isn't in the current manifest, so it can't be
 * drawn again; that is said plainly rather than shown broken.
 */
export function BoardFigure({ figureGroupId }: { figureGroupId: string }) {
  const manifest = useLessonStore((s) => s.manifest);
  const payload = useLessonStore((s) => s.payload);
  const refreshManifest = useLessonStore((s) => s.refreshManifest);
  const [refreshedFor, setRefreshedFor] = useState<string | null>(null);
  // A failure belongs to one figure under one manifest; a new figure or fresh URLs try again.
  const key = `${figureGroupId}@${manifest?.expires_at ?? 0}`;
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const failed = failedKey === key;
  const setFailed = () => setFailedKey(key);

  const pictures = picturesFor(manifest, figureGroupId);
  const group = figureGroupsOf(payload).get(figureGroupId);
  const caption = altTextOf(group);

  if (pictures.length === 0 || failed) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--ls-ink-faint)]">
        <ImageOff size={28} aria-hidden />
        <p className="text-[14px]">{failed ? "This picture couldn't load." : "This picture is from an earlier step."}</p>
      </div>
    );
  }

  const onError = () => {
    // One refresh per figure: an expired URL gets a fresh one; a second failure is real.
    if (refreshedFor === figureGroupId) return setFailed();
    setRefreshedFor(figureGroupId);
    void refreshManifest().catch(setFailed);
  };

  return (
    <figure className="flex flex-col items-center gap-3">
      {pictures.map((picture) => (
        // eslint-disable-next-line @next/next/no-img-element -- signed, expiring API URL; next/image can't cache it.
        <img
          key={picture.pictureId}
          src={picture.src}
          alt={caption}
          width={picture.width_px}
          height={picture.height_px}
          onError={onError}
          className="max-h-[52vh] w-auto max-w-full object-contain mix-blend-multiply"
        />
      ))}
      {caption && (
        <figcaption className="lesson-hand max-w-[52ch] text-center text-[18px] leading-snug text-[var(--ls-primary)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
