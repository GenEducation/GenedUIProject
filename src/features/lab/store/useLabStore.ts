import { create } from "zustand";
import { labService } from "../services/labService";
import { labStream } from "../services/labStream";
import { ApiRequestError } from "@/utils/authFetch";
import type {
  LabResponse,
  CreateLabRequest,
  LabUpdateRequest,
  DeviceResponse,
  DeviceProvisionResponse,
  RegisterDeviceRequest,
  DeviceUpdateRequest,
  SlotResponse,
  CreateSlotRequest,
  SlotUpdateRequest,
  ActivateResponse,
  BoardResponse,
  ClassReportResponse,
  CatalogResponse,
} from "../types/lab";

const BOARD_POLL_MS = 5000;

interface LabState {
  // Labs & devices (Partner / MANAGE)
  labs: LabResponse[];
  isLoadingLabs: boolean;
  devicesByLab: Record<string, DeviceResponse[]>;
  isLoadingDevices: boolean;
  /** Set once right after registration/rotation so the UI can show it exactly once. */
  lastMintedToken: { deviceId: string; token: string } | null;

  // Slots (Teacher / BOARD)
  slots: SlotResponse[];
  isLoadingSlots: boolean;

  // Teaching catalog (dropdown source for scheduling)
  catalog: CatalogResponse;
  isLoadingCatalog: boolean;

  // Live board
  activeSlotId: string | null;
  board: BoardResponse | null;
  isLoadingBoard: boolean;
  boardError: string | null;
  boardPollHandle: ReturnType<typeof setInterval> | null;
  boardStreamUnsub: (() => void) | null;

  // Report
  report: ClassReportResponse | null;
  isLoadingReport: boolean;

  lastError: string | null;

  // -- Lab actions --------------------------------------------------------------
  fetchLabs: (partnerId: string) => Promise<void>;
  createLab: (payload: CreateLabRequest) => Promise<LabResponse>;
  updateLab: (labId: string, payload: LabUpdateRequest) => Promise<void>;

  // -- Device actions -------------------------------------------------------------
  fetchDevices: (labId: string) => Promise<void>;
  registerDevice: (payload: RegisterDeviceRequest) => Promise<DeviceProvisionResponse>;
  rotateToken: (labId: string, deviceId: string) => Promise<DeviceProvisionResponse>;
  updateDevice: (labId: string, deviceId: string, payload: DeviceUpdateRequest) => Promise<void>;
  revokeDevice: (labId: string, deviceId: string) => Promise<void>;
  clearMintedToken: () => void;

  // -- Catalog ----------------------------------------------------------------------
  fetchCatalog: (partnerId: string) => Promise<void>;

  // -- Slot actions -----------------------------------------------------------------
  fetchSlots: (params?: { labId?: string; onDate?: string }) => Promise<void>;
  createSlot: (payload: CreateSlotRequest) => Promise<SlotResponse>;
  updateSlot: (slotId: string, payload: SlotUpdateRequest) => Promise<void>;
  cancelSlot: (slotId: string) => Promise<void>;
  activateSlot: (slotId: string) => Promise<ActivateResponse>;
  endSlot: (slotId: string) => Promise<void>;

  // -- Board lifecycle ------------------------------------------------------------------
  openBoard: (slotId: string, userId: string) => Promise<void>;
  refetchBoard: () => Promise<void>;
  closeBoard: () => void;

  // -- Live controls (each refetches the board; on LAB_1105 the view was stale) ---------
  bind: (studentId: string, deviceId: string) => Promise<void>;
  reassign: (sessionId: string, deviceId: string) => Promise<void>;
  resumeIncomplete: (sessionId: string, deviceId: string) => Promise<void>;
  swap: (sessionIdA: string, sessionIdB: string) => Promise<void>;
  confirmOverride: (sessionId: string) => Promise<void>;
  markAbsent: (sessionId: string) => Promise<void>;
  markPresent: (sessionId: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;

  // -- Report ---------------------------------------------------------------------------
  fetchReport: (slotId: string) => Promise<void>;
  clearReport: () => void;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export const useLabStore = create<LabState>((set, get) => ({
  labs: [],
  isLoadingLabs: false,
  devicesByLab: {},
  isLoadingDevices: false,
  lastMintedToken: null,

  slots: [],
  isLoadingSlots: false,

  catalog: { subjects: [], chapters: [], classes: [] },
  isLoadingCatalog: false,

  activeSlotId: null,
  board: null,
  isLoadingBoard: false,
  boardError: null,
  boardPollHandle: null,
  boardStreamUnsub: null,

  report: null,
  isLoadingReport: false,

  lastError: null,

  fetchLabs: async (partnerId) => {
    if (!partnerId) return;
    set({ isLoadingLabs: true, lastError: null });
    try {
      const labs = await labService.listLabs(partnerId);
      set({ labs });
    } catch (error) {
      console.error("Fetch Labs Error:", error);
      set({ lastError: errorMessage(error) });
    } finally {
      set({ isLoadingLabs: false });
    }
  },

  createLab: async (payload) => {
    const lab = await labService.createLab(payload);
    set((state) => ({ labs: [...state.labs, lab] }));
    return lab;
  },

  updateLab: async (labId, payload) => {
    const updated = await labService.updateLab(labId, payload);
    set((state) => ({ labs: state.labs.map((l) => (l.id === labId ? updated : l)) }));
  },

  fetchDevices: async (labId) => {
    set({ isLoadingDevices: true, lastError: null });
    try {
      const devices = await labService.listDevices(labId);
      set((state) => ({ devicesByLab: { ...state.devicesByLab, [labId]: devices } }));
    } catch (error) {
      console.error("Fetch Devices Error:", error);
      set({ lastError: errorMessage(error) });
    } finally {
      set({ isLoadingDevices: false });
    }
  },

  registerDevice: async (payload) => {
    const provisioned = await labService.registerDevice(payload);
    set((state) => ({
      devicesByLab: {
        ...state.devicesByLab,
        [payload.lab_id]: [...(state.devicesByLab[payload.lab_id] || []), provisioned.device],
      },
      lastMintedToken: { deviceId: provisioned.device.id, token: provisioned.device_token },
      labs: state.labs.map((l) => (l.id === payload.lab_id ? { ...l, device_count: l.device_count + 1 } : l)),
    }));
    return provisioned;
  },

  rotateToken: async (labId, deviceId) => {
    const provisioned = await labService.rotateToken(deviceId);
    set((state) => ({
      devicesByLab: {
        ...state.devicesByLab,
        [labId]: (state.devicesByLab[labId] || []).map((d) => (d.id === deviceId ? provisioned.device : d)),
      },
      lastMintedToken: { deviceId: provisioned.device.id, token: provisioned.device_token },
    }));
    return provisioned;
  },

  updateDevice: async (labId, deviceId, payload) => {
    const updated = await labService.updateDevice(deviceId, payload);
    set((state) => ({
      devicesByLab: {
        ...state.devicesByLab,
        [labId]: (state.devicesByLab[labId] || []).map((d) => (d.id === deviceId ? updated : d)),
      },
    }));
  },

  revokeDevice: async (labId, deviceId) => {
    const updated = await labService.revokeDevice(deviceId);
    set((state) => ({
      devicesByLab: {
        ...state.devicesByLab,
        [labId]: (state.devicesByLab[labId] || []).map((d) => (d.id === deviceId ? updated : d)),
      },
    }));
  },

  clearMintedToken: () => set({ lastMintedToken: null }),

  fetchCatalog: async (partnerId) => {
    if (!partnerId) return;
    set({ isLoadingCatalog: true });
    try {
      const catalog = await labService.getCatalog(partnerId);
      set({ catalog });
    } catch (error) {
      console.error("Fetch Catalog Error:", error);
      // On failure the dropdowns simply show "no options" rather than crashing.
      set({ catalog: { subjects: [], chapters: [], classes: [] } });
    } finally {
      set({ isLoadingCatalog: false });
    }
  },

  fetchSlots: async (params) => {
    set({ isLoadingSlots: true, lastError: null });
    try {
      const slots = await labService.listSlots(params);
      set({ slots });
    } catch (error) {
      console.error("Fetch Slots Error:", error);
      set({ lastError: errorMessage(error) });
    } finally {
      set({ isLoadingSlots: false });
    }
  },

  createSlot: async (payload) => {
    const slot = await labService.createSlot(payload);
    set((state) => ({ slots: [...state.slots, slot] }));
    return slot;
  },

  updateSlot: async (slotId, payload) => {
    const updated = await labService.updateSlot(slotId, payload);
    set((state) => ({ slots: state.slots.map((s) => (s.id === slotId ? updated : s)) }));
  },

  cancelSlot: async (slotId) => {
    const updated = await labService.cancelSlot(slotId);
    set((state) => ({ slots: state.slots.map((s) => (s.id === slotId ? updated : s)) }));
  },

  activateSlot: async (slotId) => {
    const result = await labService.activateSlot(slotId);
    set((state) => ({
      slots: state.slots.map((s) => (s.id === slotId ? { ...s, status: "ACTIVE" } : s)),
    }));
    return result;
  },

  endSlot: async (slotId) => {
    const updated = await labService.endSlot(slotId);
    set((state) => ({ slots: state.slots.map((s) => (s.id === slotId ? updated : s)) }));
  },

  openBoard: async (slotId, userId) => {
    get().closeBoard();
    set({ activeSlotId: slotId, isLoadingBoard: true, boardError: null });
    try {
      const board = await labService.getBoard(slotId);
      set({ board, isLoadingBoard: false });
    } catch (error) {
      console.error("Fetch Board Error:", error);
      set({ isLoadingBoard: false, boardError: errorMessage(error) });
    }

    const pollHandle = setInterval(() => {
      get().refetchBoard();
    }, BOARD_POLL_MS);

    const unsub = labStream.subscribeToBoardDeltas(userId, (delta) => {
      if (delta.slot_id === get().activeSlotId) {
        get().refetchBoard();
      }
    });

    set({ boardPollHandle: pollHandle, boardStreamUnsub: unsub });
  },

  refetchBoard: async () => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      const board = await labService.getBoard(activeSlotId);
      set({ board, boardError: null });
    } catch (error) {
      console.error("Refetch Board Error:", error);
      set({ boardError: errorMessage(error) });
    }
  },

  closeBoard: () => {
    const { boardPollHandle, boardStreamUnsub } = get();
    if (boardPollHandle) clearInterval(boardPollHandle);
    if (boardStreamUnsub) boardStreamUnsub();
    set({
      activeSlotId: null,
      board: null,
      boardError: null,
      boardPollHandle: null,
      boardStreamUnsub: null,
    });
  },

  bind: async (studentId, deviceId) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.bind(activeSlotId, studentId, deviceId);
    } finally {
      // A LAB_1105 means our view was stale — refetch regardless so the UI catches up.
      await get().refetchBoard();
    }
  },

  reassign: async (sessionId, deviceId) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.reassign(activeSlotId, sessionId, deviceId);
    } finally {
      await get().refetchBoard();
    }
  },

  resumeIncomplete: async (sessionId, deviceId) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.resumeIncomplete(activeSlotId, sessionId, deviceId);
    } finally {
      await get().refetchBoard();
    }
  },

  swap: async (sessionIdA, sessionIdB) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.swap(activeSlotId, sessionIdA, sessionIdB);
    } finally {
      await get().refetchBoard();
    }
  },

  confirmOverride: async (sessionId) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.confirmOverride(activeSlotId, sessionId);
    } finally {
      await get().refetchBoard();
    }
  },

  markAbsent: async (sessionId) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.markAbsent(activeSlotId, sessionId);
    } finally {
      await get().refetchBoard();
    }
  },

  markPresent: async (sessionId) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.markPresent(activeSlotId, sessionId);
    } finally {
      await get().refetchBoard();
    }
  },

  endSession: async (sessionId) => {
    const { activeSlotId } = get();
    if (!activeSlotId) return;
    try {
      await labService.endSession(activeSlotId, sessionId);
    } finally {
      await get().refetchBoard();
    }
  },

  fetchReport: async (slotId) => {
    set({ isLoadingReport: true, lastError: null });
    try {
      const report = await labService.getReport(slotId);
      set({ report });
    } catch (error) {
      console.error("Fetch Report Error:", error);
      set({ lastError: errorMessage(error) });
    } finally {
      set({ isLoadingReport: false });
    }
  },

  clearReport: () => set({ report: null }),
}));
