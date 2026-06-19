/**
 * usePdfStore — shared PDF viewer + AI teaching pointer state.
 *
 * Singleton pattern identical to useAudioStore (useSyncExternalStore).
 * Bridges SSE pointer events (received in useChat/useVoiceChat) to the
 * pdf-viewer screen and the chat PointerBanner without prop-drilling.
 *
 * IMPORTANT: react-native-pdf fetches URLs without auth headers. The backend
 * PDF URL requires a Bearer token, so we download it ourselves via authFetch
 * (same approach as audioPlayerService) and pass a local file:// URI instead.
 */
import { useSyncExternalStore } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { authFetch } from "../services/authFetch";
import { studentService } from "../services/studentService";
import type { PdfState, PdfPointerSpec } from "../types/pdf";

const state: PdfState = {
  documentTitle: null,
  pdfUrl: null,
  isLoading: false,
  error: null,
  activePointer: null,
  pointerPending: false,
};

const listeners = new Set<() => void>();
let snapshot: PdfState = { ...state };

function emit() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

let ttlTimer: ReturnType<typeof setTimeout> | null = null;

// ── Auth-aware PDF download ───────────────────────────────────────────────────

/** Convert ArrayBuffer → base64 string (no Node Buffer needed). */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
  }
  if (i < bytes.length) {
    const rem = bytes.length - i;
    const b0 = bytes[i];
    const b1 = rem > 1 ? bytes[i + 1] : 0;
    const n = (b0 << 16) | (b1 << 8);
    result += chars[(n >> 18) & 63] + chars[(n >> 12) & 63];
    result += rem > 1 ? chars[(n >> 6) & 63] : "=";
    result += "=";
  }
  return result;
}

/**
 * Fetch the remote PDF URL with authFetch and write to the app's local cache.
 * Returns a `file://` path usable by react-native-pdf without auth issues.
 * Skips download on cache hit (keyed by document title slug).
 */
async function downloadPdfToCache(remoteUrl: string, cacheKey: string): Promise<string> {
  const localPath = `${FileSystem.cacheDirectory}pdf-${cacheKey}.pdf`;
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) return localPath;

  const res = await authFetch(remoteUrl);
  if (!res.ok) throw new Error(`PDF download failed: HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  await FileSystem.writeAsStringAsync(localPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return localPath;
}

/** Slug a document title into a safe filename key. */
function slugify(title: string): string {
  return title.replace(/\W+/g, "-").toLowerCase().slice(0, 60);
}

// ── Store actions ─────────────────────────────────────────────────────────────

export const pdfStore = {
  /**
   * Fetch the chapter PDF URL from the backend, then download the PDF bytes
   * with auth headers and store the local file:// path in state.
   */
  async openPdf(documentTitle: string, grade: number, subject: string) {
    // Skip if already loaded for the same title
    if (state.documentTitle === documentTitle && state.pdfUrl) return;
    state.documentTitle = documentTitle;
    state.pdfUrl = null;
    state.isLoading = true;
    state.error = null;
    emit();
    try {
      const res = await studentService.fetchChapterPdfUrl(grade, subject, documentTitle);
      if (!res.pdf_url) throw new Error("No PDF URL returned by server");
      const localPath = await downloadPdfToCache(res.pdf_url, slugify(documentTitle));
      state.pdfUrl = localPath;
      state.error = null;
    } catch (e) {
      state.error = e instanceof Error ? e.message : "Failed to load PDF";
    } finally {
      state.isLoading = false;
      emit();
    }
  },

  /** SSE pointer event — set the active pointer, schedule auto-clear. */
  setPointer(spec: PdfPointerSpec) {
    if (ttlTimer) { clearTimeout(ttlTimer); ttlTimer = null; }
    state.activePointer = spec;
    state.pointerPending = true;
    emit();
    if (spec.ttlMs && spec.ttlMs > 0) {
      ttlTimer = setTimeout(() => pdfStore.clearPointer(), spec.ttlMs);
    }
  },

  /** SSE pointer_clear event or user dismiss. */
  clearPointer() {
    if (ttlTimer) { clearTimeout(ttlTimer); ttlTimer = null; }
    state.activePointer = null;
    state.pointerPending = false;
    emit();
  },

  /** Called when pdf-viewer mounts — clears the pending banner in chat. */
  acknowledgePointer() {
    state.pointerPending = false;
    emit();
  },

  /** Reset all state when leaving a chat session. */
  reset() {
    if (ttlTimer) { clearTimeout(ttlTimer); ttlTimer = null; }
    Object.assign(state, {
      documentTitle: null,
      pdfUrl: null,
      isLoading: false,
      error: null,
      activePointer: null,
      pointerPending: false,
    });
    emit();
  },
};

// ── React hooks ──────────────────────────────────────────────────────────────

export function usePdfState(): PdfState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function usePdfPointer() {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return { activePointer: s.activePointer, pointerPending: s.pointerPending };
}

export function usePdfUrl() {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return {
    documentTitle: s.documentTitle,
    pdfUrl: s.pdfUrl,
    isLoading: s.isLoading,
    error: s.error,
  };
}
