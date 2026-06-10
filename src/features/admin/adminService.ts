import { authFetch } from "@/utils/authFetch";

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
  school_board: string | null;
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

export interface CreateUserPayload {
  role: "STUDENT" | "PARENT" | "PARTNER" | "TEACHER";
  email: string;
  password: string;
  username?: string;
  age?: number;
  grade?: number;
  school_board?: string;
  parent_email?: string;
  phone?: string;
  organization?: string;
  website?: string;
  // Teacher fields
  partner_id?: string;
  full_name?: string;
  subjects?: string[];
  title?: string;
}

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
  payload: { name?: string; age?: number; grade?: number; school_board?: string; parent_email?: string },
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
