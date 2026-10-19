import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { VENDORED_MAP_SHA256 } from "../components/items/MapPointItem";

/**
 * `answer_key.point` is only valid against the exact bytes these files were
 * plotted on — see `MapPointItem.tsx`. This test catches OUR OWN mistake
 * (a hand-edit, a bad re-vendor) by hashing the real files under
 * `public/placement/maps/` and asserting they equal the hashes verified
 * against the backend's `assets.json` at vendoring time. The runtime check
 * in `MapPointItem.tsx` (comparing against the server-sent `sha256`) is what
 * catches the backend swapping the file after deploy — this test only
 * guards the copy we shipped.
 */
const PUBLIC_MAPS_DIR = path.resolve(__dirname, "../../../../public/placement/maps");

describe("vendored map assets", () => {
  for (const [image, expectedHash] of Object.entries(VENDORED_MAP_SHA256)) {
    it(`${image}.svg matches the hash recorded from the backend's assets.json`, () => {
      const bytes = readFileSync(path.join(PUBLIC_MAPS_DIR, `${image}.svg`));
      const hash = createHash("sha256").update(bytes).digest("hex");
      expect(hash).toBe(expectedHash);
    });
  }
});
