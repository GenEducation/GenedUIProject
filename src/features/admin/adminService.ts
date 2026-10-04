import { ApiRequestError, authFetch } from "@/utils/authFetch";
import type { EducationBoard } from "@/types/education";
import type {
  AdminDeviceDetail,
  AdminDeviceListItem,
  AdminLabListItem,
  AdminLabStats,
  CanonicalDevice,
  DeviceDiagnostic,
  DeviceQuery,
  FleetDeviceQuery,
  FleetStats,
  Paginated,
  PaginatedFleet,
} from "./devices/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Types ──────────────────────────────────────────────────────

export type Role = "STUDENT" | "PARENT" | "PARTNER" | "TEACHER" | "ADMIN";
export type Plan = "FREE" | "PRO";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  plan: Plan;
  plan_expires_at: string | null;
}

export interface PaginatedUsers {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminStats {
  users_total: number;
  students: number;
  parents: number;
  partners: number;
  teachers: number;
  admins: number;
  plan_free: number;
  plan_pro: number;
  enrollments_total: number;
  enrollments_pending: number;
  teacher_links_total: number;
  teacher_links_pending: number;
  agents_total: number;
  ingestions_total: number;
}

export interface Enrollment {
  student_id: string;
  partner_id: string;
  student_username: string | null;
  partner_organization: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAgent {
  id: string;
  name: string;
  subject: string;
  grade: number | null;
  document_title: string | null;
  is_available: boolean;
  owner_partner_id: string | null;
  owner_name: string | null;
}

export interface StudentRow {
  id: string;
  username: string;
  email: string;
  name: string | null;
  age: number | null;
  grade: number | null;
  school_board: EducationBoard;
  parent_email: string | null;
  plan: Plan;
}

export interface ParentRow {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  student_count: number;
}

export interface PartnerRow {
  id: string;
  username: string;
  email: string;
  organization: string | null;
  website: string | null;
  board: EducationBoard;
  student_count: number;
}

export interface TeacherRow {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  subjects: string[];
  title: string | null;
  partner_id: string | null;
  partner_org: string | null;
  board: EducationBoard;
  student_count: number;
  plan: Plan;
}

export interface Assignment {
  teacher_id: string;
  student_id: string;
  teacher_name: string | null;
  student_username: string | null;
  subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Ingestion {
  id: string;
  partner_id: string | null;
  partner_name: string | null;
  document_title: string;
  subject: string;
  grade: number;
  board: string;
  document_type: string;
  chunks_created: number;
  status: string;
  ingested_at: string;
}

interface CreateUserBase {
  email: string;
  password: string;
  username?: string;
}

export type CreateUserPayload =
  | (CreateUserBase & {
      role: "STUDENT";
      age?: number;
      grade?: number;
      parent_email?: string;
      partner_id?: string;
    })
  | (CreateUserBase & {
      role: "PARENT";
      phone?: string;
    })
  | (CreateUserBase & {
      role: "PARTNER";
      organization?: string;
      website?: string;
      board: EducationBoard;
    })
  | (CreateUserBase & {
      role: "TEACHER";
      partner_id: string;
      full_name?: string;
      subjects?: string[];
      title?: string;
    });

// ── Helpers ────────────────────────────────────────────────────

async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(`${API_BASE_URL}${path}`);
  return res.json();
}

async function send<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await authFetch(`${API_BASE_URL}${path}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

// ── Stats ──────────────────────────────────────────────────────

export const getStats = () => getJson<AdminStats>("/admin/stats");

// ── Users ──────────────────────────────────────────────────────

export function listUsers(params: {
  role?: string;
  q?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedUsers> {
  const qs = new URLSearchParams();
  if (params.role) qs.set("role", params.role);
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.pageSize ?? 25));
  return getJson<PaginatedUsers>(`/admin/users?${qs.toString()}`);
}

export const getUser = (id: string) => getJson<Record<string, unknown>>(`/admin/users/${id}`);

export const createUser = (payload: CreateUserPayload) =>
  send<Record<string, unknown>>("/admin/users", "POST", payload);

export const updateUser = (
  id: string,
  payload: Partial<Pick<AdminUser, "username" | "email" | "role" | "plan" | "plan_expires_at">>,
) => send<{ message: string }>(`/admin/users/${id}`, "PATCH", payload);

export const deleteUser = (id: string) =>
  send<{ message: string }>(`/admin/users/${id}`, "DELETE");

// ── Partners / Students ────────────────────────────────────────

export const listPartners = () => getJson<PartnerRow[]>("/admin/partners");
export const listStudents = () => getJson<StudentRow[]>("/admin/students");
export const listParents = () => getJson<ParentRow[]>("/admin/parents");

export const updateStudent = (
  id: string,
  payload: { name?: string; age?: number; grade?: number; parent_email?: string },
) => send<{ message: string }>(`/admin/students/${id}`, "PATCH", payload);

export const updateParent = (id: string, payload: { phone?: string }) =>
  send<{ message: string }>(`/admin/parents/${id}`, "PATCH", payload);

export const updatePartner = (
  id: string,
  payload: {
    organization?: string;
    website?: string;
    enable_teachers?: boolean;
    allow_transcript_access?: boolean;
    board?: EducationBoard;
  },
) => send<{ message: string }>(`/admin/partners/${id}`, "PATCH", payload);

// ── Teachers ───────────────────────────────────────────────────

export const listTeachers = () => getJson<TeacherRow[]>("/admin/teachers");

export const updateTeacher = (
  id: string,
  payload: { full_name?: string; subjects?: string[]; title?: string; partner_id?: string },
) => send<{ message: string }>(`/admin/teachers/${id}`, "PATCH", payload);

// ── Teacher<->Student assignments ──────────────────────────────

export const listAssignments = () => getJson<Assignment[]>("/admin/teacher-students");

export const updateAssignment = (
  teacherId: string,
  studentId: string,
  payload: { status: string; subject?: string; cascade?: boolean },
) =>
  send<{ message: string }>(
    `/admin/teacher-students/${teacherId}/${studentId}`,
    "PATCH",
    payload,
  );

// ── Enrollments ────────────────────────────────────────────────

export const listEnrollments = () => getJson<Enrollment[]>("/admin/enrollments");

export const updateEnrollment = (studentId: string, partnerId: string, status: string) =>
  send<{ message: string }>(
    `/admin/enrollments/${studentId}/${partnerId}`,
    "PATCH",
    { status },
  );

// ── Agents ─────────────────────────────────────────────────────

export const listAgents = () => getJson<AdminAgent[]>("/admin/agents");

export const updateAgent = (
  id: string,
  payload: { name?: string; is_available?: boolean },
) => send<{ message: string }>(`/admin/agents/${id}`, "PATCH", payload);

export const deleteAgent = (id: string) =>
  send<{ message: string }>(`/admin/agents/${id}`, "DELETE");

// ── Ingestions ─────────────────────────────────────────────────

export const listIngestions = () => getJson<Ingestion[]>("/admin/ingestions");

// ── Custom wake-word models ────────────────────────────────────

export interface WakewordModel {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  device_id: string | null;
  phrase: string;
  model_name: string;
  model_size: string;
  status: string;
  progress: number;
  model_num_bytes: number | null;
  model_sha256: string | null;
  has_report: boolean;
  error_code: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WakewordReport {
  job_id: string;
  model_name: string;
  report_md: string | null;
  report_json: Record<string, unknown> | null;
}

export const listWakewordModels = () =>
  getJson<WakewordModel[]>("/admin/wakeword-models");

export const getWakewordReport = (jobId: string) =>
  getJson<WakewordReport>(`/admin/wakeword-models/${jobId}/report`);

/** Download a trained ONNX (authed → blob → save). */
export async function downloadWakewordModel(jobId: string, modelName: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/admin/wakeword-models/${jobId}/download`);
  if (!res.ok) throw new Error("Failed to download model");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${modelName}.onnx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Device fleet (ADMIN-ONLY cross-school views, spec §6.7) ────

export const getLabStats = () => getJson<AdminLabStats>("/admin/lab/stats");

export function listFleetDevices(
  params: DeviceQuery = {},
): Promise<Paginated<AdminDeviceListItem>> {
  const qs = new URLSearchParams();
  if (params.partner_id) qs.set("partner_id", params.partner_id);
  if (params.lab_id) qs.set("lab_id", params.lab_id);
  if (params.health_status) qs.set("health_status", params.health_status);
  if (params.q) qs.set("q", params.q);
  // `has_fault` is meaningful as an explicit false, so test for undefined.
  if (params.has_fault !== undefined) qs.set("has_fault", String(params.has_fault));
  if (params.stale_minutes !== undefined) qs.set("stale_minutes", String(params.stale_minutes));
  if (params.include_revoked !== undefined) {
    qs.set("include_revoked", String(params.include_revoked));
  }
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 25));
  return getJson<Paginated<AdminDeviceListItem>>(`/admin/lab/devices?${qs.toString()}`);
}

export const getFleetDevice = (id: string) =>
  getJson<AdminDeviceDetail>(`/admin/lab/devices/${encodeURIComponent(id)}`);

export function listFleetLabs(
  params: { partner_id?: string; q?: string; page?: number; page_size?: number } = {},
): Promise<Paginated<AdminLabListItem>> {
  const qs = new URLSearchParams();
  if (params.partner_id) qs.set("partner_id", params.partner_id);
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 25));
  return getJson<Paginated<AdminLabListItem>>(`/admin/lab/labs?${qs.toString()}`);
}

/**
 * Device logs. Not a fleet route — `/lab/devices/{id}/logs` already admits ADMIN
 * and keys on the device id, so it needs no `/admin` variant (spec §6.7).
 * The response shape is undocumented; callers render it defensively.
 */
export const getDeviceLogs = (id: string) =>
  getJson<unknown>(`/lab/devices/${encodeURIComponent(id)}/logs`);

/**
 * The latest gened-health system diagnostic for one device.
 *
 * Keyed on the DEVICE KEY, not the LabDevice UUID the rest of this file uses:
 * this record is mode-independent and exists for devices that have no Lab row
 * at all, so it cannot hang off the Lab primary key. `hardware_id` from the
 * device detail payload is the right thing to pass. The server also accepts the
 * raw SoC serial or the device's own reported id.
 *
 * Resolves to `null` when the device has never reported, because that is an
 * ordinary state for a unit that has not been updated yet — not a failure worth
 * showing an error for. Every other status still throws.
 */
export async function getDeviceDiagnostic(
  deviceKey: string,
): Promise<DeviceDiagnostic | null> {
  try {
    return await getJson<DeviceDiagnostic>(
      `/admin/devices/${encodeURIComponent(deviceKey)}/diagnostic`,
    );
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    throw e;
  }
}

/**
 * The canonical device: four independent dimensions plus the nested diagnostic.
 *
 * Prefer this over `getDeviceDiagnostic` for anything that needs to know whether
 * a device is REACHABLE. The diagnostic alone cannot answer that — it says when
 * the device last spoke, and a healthy unit on an hourly cadence is silent most
 * of the time.
 *
 * `deviceKey` accepts a serial, a reported device id, a Lab hardware id, or the
 * derived DEV-XXXX-XXXX. Resolves to `null` on 404, which here means "no device
 * is registered under this identifier" — a device that exists but has never
 * reported still returns a full record with `diagnostic: null`.
 */
export async function getCanonicalDevice(
  deviceKey: string,
): Promise<CanonicalDevice | null> {
  try {
    return await getJson<CanonicalDevice>(
      `/admin/devices/${encodeURIComponent(deviceKey)}`,
    );
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Pre-register a physical device before it has ever reported.
 *
 * Throws on a malformed serial (400) and on an already-registered one (409).
 * The conflict is deliberate on the server side — "register" and "update" are
 * different intents, and a silent upsert would discard observed history the
 * operator cannot see on the form.
 */
export const registerCanonicalDevice = (body: {
  serial: string;
  label?: string;
  reported_device_id?: string;
  device_model?: string;
}) => send<CanonicalDevice>("/admin/devices", "POST", body);

// ── The mode-independent fleet view (Phase 4) ──────────────────

/**
 * One page of the whole fleet: every physical device, across every mode.
 *
 * Distinct from `listFleetDevices` above, which lists Lab ENROLLMENTS and so can
 * only ever show SCHOOL_LAB units. This one also covers PERSONAL devices,
 * pre-provisioned units that have never spoken, and legacy devices with no
 * canonical registry row.
 *
 * Everything is server-side: filtering, sorting and paging all happen in the
 * query, and `total` is the match count before paging. Do NOT fetch every page
 * and filter in the browser — the attention flag and connectivity are derived
 * server-side from transports, and a client-side copy of either would be a
 * second set of rules free to disagree with the first.
 */
export function listFleetRegistryDevices(
  params: FleetDeviceQuery = {},
): Promise<PaginatedFleet> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.record) qs.set("record", params.record);
  if (params.mode) qs.set("mode", params.mode);
  if (params.provenance) qs.set("provenance", params.provenance);
  if (params.connectivity) qs.set("connectivity", params.connectivity);
  if (params.freshness) qs.set("freshness", params.freshness);
  if (params.verdict) qs.set("verdict", params.verdict);
  // Meaningful as an explicit false ("show me only the calm ones"), so this
  // tests for undefined rather than falsiness.
  if (params.needs_attention !== undefined) {
    qs.set("needs_attention", String(params.needs_attention));
  }
  if (params.include_revoked !== undefined) {
    qs.set("include_revoked", String(params.include_revoked));
  }
  if (params.sort) qs.set("sort", params.sort);
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 25));
  return getJson<PaginatedFleet>(`/admin/devices?${qs.toString()}`);
}

/**
 * Fleet-wide counts per dimension, independent of any list filter.
 *
 * Unfiltered on purpose — see `FleetStats`. The tiles' job is to let an operator
 * check that the filtered rows add up, which a self-recounting tile cannot do.
 */
export const getFleetDeviceStats = () => getJson<FleetStats>("/admin/devices/stats");

// ── Bulk import ────────────────────────────────────────────────

export type ImportRole = "STUDENT" | "PARENT" | "PARTNER" | "TEACHER";

export interface ImportRowResult {
  row: number;
  role: string | null;
  email: string | null;
  username: string | null;
  status: "valid" | "created" | "skipped" | "error";
  linked_partner: string | null;
  linked_teacher: string | null;
  generated_password: string | null;
  messages: string[];
}

export interface ImportSummary {
  dry_run: boolean;
  role: string;
  total: number;
  valid: number;
  invalid: number;
  created: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
}

export interface ImportContext {
  type: "partner" | "teacher" | "student";
  id: string;
}

/** Download the per-role template (authed → fetch as blob, then save). */
export async function downloadImportTemplate(role: ImportRole): Promise<void> {
  const res = await authFetch(
    `${API_BASE_URL}/admin/users/import/template?role=${encodeURIComponent(role)}`,
  );
  if (!res.ok) throw new Error("Failed to download template");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gened_${role.toLowerCase()}_import_template.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importUsers(
  file: File,
  opts: {
    role: ImportRole;
    dryRun: boolean;
    sendWelcome?: boolean;
    context?: ImportContext;
  },
): Promise<ImportSummary> {
  const qs = new URLSearchParams();
  qs.set("role", opts.role);
  qs.set("dry_run", String(opts.dryRun));
  qs.set("send_welcome", String(opts.sendWelcome ?? true));
  if (opts.context) {
    qs.set("context_type", opts.context.type);
    qs.set("context_id", opts.context.id);
  }
  const form = new FormData();
  form.append("file", file);
  const res = await authFetch(`${API_BASE_URL}/admin/users/import?${qs.toString()}`, {
    method: "POST",
    body: form,
  });
  return res.json();
}
