/**
 * Lab store — mirrors the web app's useLabStore.ts (zustand) but follows
 * Android's useSyncExternalStore singleton-module pattern, matching
 * useNotificationStore.ts / usePrefsStore.ts.
 */
import { useSyncExternalStore } from "react";
import { labService } from "../services/labService";
import { labStream } from "../services/labStream";
import type {
  LabResponse,
  DeviceResponse,
  CatalogResponse,
  SlotResponse,
  BoardResponse,
  ClassReportResponse,
  CreateLabRequest,
  RegisterDeviceRequest,
  CreateSlotRequest,
} from "../types/lab";

interface LabState {
  labs: LabResponse[];
  isLoadingLabs: boolean;

  devices: DeviceResponse[];
  isLoadingDevices: boolean;

  catalog: CatalogResponse | null;
  isLoadingCatalog: boolean;

  slots: SlotResponse[];
  isLoadingSlots: boolean;

  board: BoardResponse | null;
  isLoadingBoard: boolean;
  boardError: string | null;

  report: ClassReportResponse | null;
  isLoadingReport: boolean;
}

const state: LabState = {
  labs: [],
  isLoadingLabs: false,
  devices: [],
  isLoadingDevices: false,
  catalog: null,
  isLoadingCatalog: false,
  slots: [],
  isLoadingSlots: false,
  board: null,
  isLoadingBoard: false,
  boardError: null,
  report: null,
  isLoadingReport: false,
};

const listeners = new Set<() => void>();
let snapshot: LabState = { ...state };

function emit() {
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Unsubscribe fn for the currently-open board's SSE stream, if any. */
let boardStreamUnsub: (() => void) | null = null;
/** slot_id the board stream is currently scoped to — deltas for other slots are ignored. */
let boardStreamSlotId: string | null = null;

export const labStore = {
  // -- Labs ---------------------------------------------------------------
  fetchLabs: async (partnerId: string) => {
    state.isLoadingLabs = true;
    emit();
    try {
      state.labs = await labService.listLabs(partnerId);
    } catch {
      /* keep previous state on error */
    } finally {
      state.isLoadingLabs = false;
      emit();
    }
  },

  createLab: async (payload: CreateLabRequest): Promise<LabResponse> => {
    const lab = await labService.createLab(payload);
    state.labs = [lab, ...state.labs];
    emit();
    return lab;
  },

  // -- Devices --------------------------------------------------------------
  fetchDevices: async (labId: string) => {
    state.isLoadingDevices = true;
    emit();
    try {
      state.devices = await labService.listDevices(labId);
    } catch {
      /* keep previous state on error */
    } finally {
      state.isLoadingDevices = false;
      emit();
    }
  },

  registerDevice: async (payload: RegisterDeviceRequest) => {
    const provision = await labService.registerDevice(payload);
    state.devices = [provision.device, ...state.devices];
    emit();
    return provision;
  },

  rotateToken: async (deviceId: string) => {
    const provision = await labService.rotateToken(deviceId);
    state.devices = state.devices.map((d) => (d.id === deviceId ? provision.device : d));
    emit();
    return provision;
  },

  revokeDevice: async (deviceId: string) => {
    const updated = await labService.revokeDevice(deviceId);
    state.devices = state.devices.map((d) => (d.id === deviceId ? updated : d));
    emit();
  },

  // -- Catalog ----------------------------------------------------------------
  fetchCatalog: async (partnerId: string, grade?: number) => {
    state.isLoadingCatalog = true;
    emit();
    try {
      state.catalog = await labService.getCatalog(partnerId, grade);
    } catch {
      /* keep previous state on error */
    } finally {
      state.isLoadingCatalog = false;
      emit();
    }
  },

  // -- Slots ------------------------------------------------------------------
  fetchSlots: async (params?: { labId?: string; onDate?: string }) => {
    state.isLoadingSlots = true;
    emit();
    try {
      state.slots = await labService.listSlots(params);
    } catch {
      /* keep previous state on error */
    } finally {
      state.isLoadingSlots = false;
      emit();
    }
  },

  createSlot: async (payload: CreateSlotRequest): Promise<SlotResponse> => {
    const slot = await labService.createSlot(payload);
    state.slots = [slot, ...state.slots];
    emit();
    return slot;
  },

  activateSlot: async (slotId: string) => {
    const result = await labService.activateSlot(slotId);
    // activateSlot's response doesn't carry the full SlotResponse — the slot is
    // now ACTIVE by definition, so patch the cached copy locally.
    state.slots = state.slots.map((s) => (s.id === slotId ? { ...s, status: "ACTIVE" } : s));
    emit();
    return result;
  },

  endSlot: async (slotId: string) => {
    const slot = await labService.endSlot(slotId);
    state.slots = state.slots.map((s) => (s.id === slotId ? slot : s));
    emit();
    return slot;
  },

  cancelSlot: async (slotId: string) => {
    const slot = await labService.cancelSlot(slotId);
    state.slots = state.slots.map((s) => (s.id === slotId ? slot : s));
    emit();
    return slot;
  },

  // -- Board --------------------------------------------------------------------
  /** Fetches the board and opens the SSE stream, refetching on every delta for this slot. */
  openBoard: async (slotId: string, userId: string) => {
    labStore.closeBoard();
    boardStreamSlotId = slotId;
    state.isLoadingBoard = true;
    state.boardError = null;
    emit();

    const refetch = async () => {
      try {
        state.board = await labService.getBoard(slotId);
        state.boardError = null;
      } catch (e) {
        state.boardError = e instanceof Error ? e.message : "Failed to load board";
      } finally {
        state.isLoadingBoard = false;
        emit();
      }
    };

    await refetch();

    boardStreamUnsub = labStream.subscribeToBoardDeltas(userId, (delta) => {
      if (delta.slot_id !== boardStreamSlotId) return;
      refetch();
    });
  },

  /** Manual refresh of the currently-open board (e.g. a pull-to-refresh / refresh button). */
  refetchBoard: async () => {
    if (!boardStreamSlotId) return;
    try {
      state.board = await labService.getBoard(boardStreamSlotId);
      state.boardError = null;
    } catch (e) {
      state.boardError = e instanceof Error ? e.message : "Failed to load board";
    }
    emit();
  },

  closeBoard: () => {
    if (boardStreamUnsub) {
      boardStreamUnsub();
      boardStreamUnsub = null;
    }
    boardStreamSlotId = null;
    state.board = null;
    state.boardError = null;
    emit();
  },

  // -- Allocation actions ---------------------------------------------------------
  bindDevice: (slotId: string, studentId: string, deviceId: string) =>
    labService.bind(slotId, studentId, deviceId),

  reassign: (slotId: string, sessionId: string, deviceId: string) =>
    labService.reassign(slotId, sessionId, deviceId),

  resume: (slotId: string, sessionId: string, deviceId: string) =>
    labService.resumeIncomplete(slotId, sessionId, deviceId),

  swap: (slotId: string, sessionIdA: string, sessionIdB: string) =>
    labService.swap(slotId, sessionIdA, sessionIdB),

  confirmOverride: (slotId: string, sessionId: string) => labService.confirmOverride(slotId, sessionId),

  markAbsent: (slotId: string, sessionId: string) => labService.markAbsent(slotId, sessionId),

  markPresent: (slotId: string, sessionId: string) => labService.markPresent(slotId, sessionId),

  endSession: (slotId: string, sessionId: string) => labService.endSession(slotId, sessionId),

  // -- Report -----------------------------------------------------------------------
  fetchReport: async (slotId: string) => {
    state.isLoadingReport = true;
    emit();
    try {
      state.report = await labService.getReport(slotId);
    } catch {
      /* keep previous state on error */
    } finally {
      state.isLoadingReport = false;
      emit();
    }
  },

  get: () => snapshot,
};

export function useLabStore(): LabState {
  return useSyncExternalStore(subscribe, () => snapshot);
}
