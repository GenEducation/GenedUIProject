#!/usr/bin/env node
/**
 * copy-vad-assets.mjs
 *
 * Copies the runtime assets needed by @ricky0123/vad-web + onnxruntime-web
 * into Next's public/ directory so they're served at the site root.
 *
 * Why this exists:
 *   - voiceService.ts loads Silero VAD with baseAssetPath="/" and
 *     onnxWASMBasePath="/", which means the ONNX model, the AudioWorklet
 *     bundle, and all onnxruntime-web .wasm/.mjs glue files must live in
 *     /public.
 *   - Those files together are ~40 MB of binaries we explicitly DO NOT want
 *     to commit. Instead we copy them from node_modules on every install.
 *
 * Runs automatically as a `postinstall` step. Idempotent — safe to re-run.
 * Fails silently in CI environments that prune devDependencies before this
 * script lands (the VAD assets just won't be present, and voiceService.ts
 * falls back to RMS-only gating).
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const publicDir = resolve(projectRoot, "public");

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// Each entry: [source path relative to node_modules, dest filename in public/]
const assets = [
  // Silero VAD models + worklet
  ["@ricky0123/vad-web/dist/silero_vad_legacy.onnx", "silero_vad_legacy.onnx"],
  ["@ricky0123/vad-web/dist/silero_vad_v5.onnx", "silero_vad_v5.onnx"],
  ["@ricky0123/vad-web/dist/vad.worklet.bundle.min.js", "vad.worklet.bundle.min.js"],

  // onnxruntime-web WASM + JS-glue. ORT feature-detects which build to load
  // at runtime, so all four pairs need to be present.
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.wasm"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.mjs"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm", "ort-wasm-simd-threaded.jsep.wasm"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.mjs"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm", "ort-wasm-simd-threaded.asyncify.wasm"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.mjs"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.jspi.wasm", "ort-wasm-simd-threaded.jspi.wasm"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.jspi.mjs", "ort-wasm-simd-threaded.jspi.mjs"],
];

let copied = 0;
let skipped = 0;

for (const [src, destName] of assets) {
  const srcPath = resolve(projectRoot, "node_modules", src);
  const destPath = resolve(publicDir, destName);

  if (!existsSync(srcPath)) {
    // Dep not installed yet (or pruned) — skip silently.
    skipped++;
    continue;
  }

  try {
    copyFileSync(srcPath, destPath);
    copied++;
  } catch (err) {
    console.warn(`[copy-vad-assets] Failed to copy ${destName}:`, err.message);
  }
}

if (copied > 0) {
  console.log(`[copy-vad-assets] Copied ${copied} VAD/ORT asset(s) into public/`);
}
if (skipped > 0 && copied === 0) {
  console.log(`[copy-vad-assets] Skipped ${skipped} asset(s) — node_modules not yet populated.`);
}
