import { authFetch } from "@/utils/authFetch";
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
  SessionResponse,
  BoardResponse,
  ClassReportResponse,
} from "../types/lab";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required. Set it in your .env.local file.");
}

const jsonHeaders = { "Content-Type": "application/json" };

export const labService = {
  // -- Labs ---------------------------------------------------------------
  createLab: async (payload: CreateLabRequest): Promise<LabResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/labs`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  listLabs: async (partnerId: string): Promise<LabResponse[]> => {
    const res = await authFetch(`${BASE_URL}/lab/labs?partner_id=${encodeURIComponent(partnerId)}`);
    return res.json();
  },

  updateLab: async (labId: string, payload: LabUpdateRequest): Promise<LabResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/labs/${encodeURIComponent(labId)}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // -- Devices --------------------------------------------------------------
  registerDevice: async (payload: RegisterDeviceRequest): Promise<DeviceProvisionResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/devices`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  rotateToken: async (deviceId: string): Promise<DeviceProvisionResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/devices/${encodeURIComponent(deviceId)}/rotate-token`, {
      method: "POST",
    });
    return res.json();
  },

  listDevices: async (labId: string): Promise<DeviceResponse[]> => {
    const res = await authFetch(`${BASE_URL}/lab/labs/${encodeURIComponent(labId)}/devices`);
    return res.json();
  },

  updateDevice: async (deviceId: string, payload: DeviceUpdateRequest): Promise<DeviceResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/devices/${encodeURIComponent(deviceId)}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  revokeDevice: async (deviceId: string): Promise<DeviceResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/devices/${encodeURIComponent(deviceId)}/revoke`, {
      method: "POST",
    });
    return res.json();
  },

  // -- Slots ------------------------------------------------------------------
  createSlot: async (payload: CreateSlotRequest): Promise<SlotResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  listSlots: async (params?: { labId?: string; onDate?: string }): Promise<SlotResponse[]> => {
    const qs = new URLSearchParams();
    if (params?.labId) qs.set("lab_id", params.labId);
    if (params?.onDate) qs.set("on_date", params.onDate);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await authFetch(`${BASE_URL}/lab/slots${suffix}`);
    return res.json();
  },

  updateSlot: async (slotId: string, payload: SlotUpdateRequest): Promise<SlotResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  cancelSlot: async (slotId: string): Promise<SlotResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/cancel`, {
      method: "POST",
    });
    return res.json();
  },

  activateSlot: async (slotId: string): Promise<ActivateResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/activate`, {
      method: "POST",
    });
    return res.json();
  },

  endSlot: async (slotId: string): Promise<SlotResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/end`, {
      method: "POST",
    });
    return res.json();
  },

  // -- Board --------------------------------------------------------------------
  getBoard: async (slotId: string): Promise<BoardResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/board`);
    return res.json();
  },

  // -- Allocation actions ---------------------------------------------------------
  bind: async (slotId: string, studentId: string, deviceId: string): Promise<SessionResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/bind`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ student_id: studentId, device_id: deviceId }),
    });
    return res.json();
  },

  reassign: async (slotId: string, sessionId: string, deviceId: string): Promise<SessionResponse> => {
    const res = await authFetch(
      `${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/sessions/${encodeURIComponent(sessionId)}/reassign`,
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ device_id: deviceId }),
      },
    );
    return res.json();
  },

  swap: async (slotId: string, sessionIdA: string, sessionIdB: string): Promise<SessionResponse[]> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/swap`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ session_id_a: sessionIdA, session_id_b: sessionIdB }),
    });
    return res.json();
  },

  confirmOverride: async (slotId: string, sessionId: string): Promise<SessionResponse> => {
    const res = await authFetch(
      `${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/sessions/${encodeURIComponent(sessionId)}/confirm-override`,
      { method: "POST" },
    );
    return res.json();
  },

  markAbsent: async (slotId: string, sessionId: string): Promise<SessionResponse> => {
    const res = await authFetch(
      `${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/sessions/${encodeURIComponent(sessionId)}/absent`,
      { method: "POST" },
    );
    return res.json();
  },

  endSession: async (slotId: string, sessionId: string): Promise<SessionResponse> => {
    const res = await authFetch(
      `${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/sessions/${encodeURIComponent(sessionId)}/end`,
      { method: "POST" },
    );
    return res.json();
  },

  // -- Report -----------------------------------------------------------------------
  getReport: async (slotId: string): Promise<ClassReportResponse> => {
    const res = await authFetch(`${BASE_URL}/lab/slots/${encodeURIComponent(slotId)}/report`);
    return res.json();
  },
};
