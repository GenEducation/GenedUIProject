#!/usr/bin/env node
/**
 * copy-pdfjs-assets.mjs
 *
 * Copies pdf.js's worker and its image decoders into public/ so they're served at the site root.
 *
 * Why this exists:
 *   - pdf.js v5 decodes JPEG 2000 (JPXDecode) and JBIG2 images with WebAssembly modules it loads from `wasmUrl`
 *     (usePdfDocument.ts passes "/pdfjs-wasm/"). Without them it skips those images silently: textbook scans
 *     (NCERT's are JPEG 2000) then show text with every picture missing.
 *
 * Runs as a `postinstall` step. Idempotent.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pdfjs = resolve(projectRoot, "node_modules/pdfjs-dist");
const publicDir = resolve(projectRoot, "public");

if (!existsSync(pdfjs)) process.exit(0);

copyFileSync(resolve(pdfjs, "build/pdf.worker.min.mjs"), resolve(publicDir, "pdf.worker.min.mjs"));
const wasmOut = resolve(publicDir, "pdfjs-wasm");
mkdirSync(wasmOut, { recursive: true });
for (const name of readdirSync(resolve(pdfjs, "wasm"))) {
  copyFileSync(resolve(pdfjs, "wasm", name), resolve(wasmOut, name));
}
