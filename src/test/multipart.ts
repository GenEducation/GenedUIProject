import { File as NodeFile } from "node:buffer";
import { afterAll, beforeAll } from "vitest";

/**
 * Multipart uploads under jsdom: the app builds `FormData` and `File`, which
 * jsdom supplies, but `fetch` is Node's (undici), and undici refuses a body
 * built from jsdom's classes. Browsers have one implementation, so this is a
 * test-environment seam only. Call once at the top of a suite that uploads.
 */
export function installNodeMultipart() {
  const original = { FormData: globalThis.FormData, File: globalThis.File };
  beforeAll(async () => {
    // Node's own FormData constructor, reached through a form undici parsed itself.
    const nodeForm = await new Response(new URLSearchParams("a=1")).formData();
    globalThis.FormData = nodeForm.constructor as typeof FormData;
    globalThis.File = NodeFile as unknown as typeof File;
  });
  afterAll(() => {
    globalThis.FormData = original.FormData;
    globalThis.File = original.File;
  });
}

/** A SYNTHETIC PDF-looking file that undici accepts in a multipart body. */
export function syntheticPdf(name = "synthetic.pdf", bytes = "%PDF-SYNTHETIC"): File {
  return new globalThis.File([bytes], name, { type: "application/pdf" });
}
