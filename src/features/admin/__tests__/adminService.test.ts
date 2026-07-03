import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateAssignment,
  importUsers,
  downloadImportTemplate,
} from "../adminService";
import { seedAuthLocalStorage } from "@/test/helpers/auth";

// adminService uses authFetch (wraps global fetch). Stub fetch, let real authFetch run.

function stubFetch(body: unknown, status = 200) {
  const init = { status, headers: { "Content-Type": "application/json" } };
  const response =
    typeof body === "string" ? new Response(body, init) : new Response(JSON.stringify(body), init);
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function firstCall(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init };
}

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage("admin", { profile: { user_id: "a1" } });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminService.listUsers — query-string building", () => {
  it("applies page=1 & page_size=25 defaults when nothing is passed", async () => {
    const fetchMock = stubFetch({ items: [], total: 0, page: 1 });
    await listUsers();
    const { url } = firstCall(fetchMock);
    expect(url).toContain("/admin/users?");
    expect(url).toContain("page=1");
    expect(url).toContain("page_size=25");
    expect(url).not.toContain("role=");
    expect(url).not.toContain("q=");
  });

  it("includes role, q, and custom pagination when provided", async () => {
    const fetchMock = stubFetch({ items: [], total: 0, page: 2 });
    await listUsers({ role: "TEACHER", q: "ada", page: 2, pageSize: 50 });
    const { url } = firstCall(fetchMock);
    expect(url).toContain("role=TEACHER");
    expect(url).toContain("q=ada");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=50");
  });
});

describe("adminService — send()-based mutations", () => {
  it("createUser POSTs the payload to /admin/users", async () => {
    const fetchMock = stubFetch({ id: "u1" });
    await createUser({ role: "STUDENT", email: "k@x.com", password: "pw" });
    const { url, init } = firstCall(fetchMock);
    expect(url).toMatch(/\/admin\/users$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ role: "STUDENT", email: "k@x.com", password: "pw" });
  });

  it("updateUser PATCHes /admin/users/:id with the partial payload", async () => {
    const fetchMock = stubFetch({ message: "ok" });
    await updateUser("u1", { plan: "PRO" });
    const { url, init } = firstCall(fetchMock);
    expect(url).toMatch(/\/admin\/users\/u1$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ plan: "PRO" });
  });

  it("deleteUser DELETEs /admin/users/:id with no body", async () => {
    const fetchMock = stubFetch({ message: "gone" });
    await deleteUser("u1");
    const { url, init } = firstCall(fetchMock);
    expect(url).toMatch(/\/admin\/users\/u1$/);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("updateAssignment PATCHes the composite teacher/student path", async () => {
    const fetchMock = stubFetch({ message: "ok" });
    await updateAssignment("t1", "s1", { status: "APPROVED", subject: "Math", cascade: true });
    const { url, init } = firstCall(fetchMock);
    expect(url).toMatch(/\/admin\/teacher-students\/t1\/s1$/);
    expect(JSON.parse(init.body)).toEqual({ status: "APPROVED", subject: "Math", cascade: true });
  });
});

describe("adminService.importUsers — multipart + query flags", () => {
  it("POSTs the file as FormData with role, dry_run, and send_welcome=true default", async () => {
    const fetchMock = stubFetch({ dry_run: true, total: 0, rows: [] });
    const file = new File(["email\na@x.com"], "import.csv", { type: "text/csv" });

    await importUsers(file, { role: "STUDENT", dryRun: true });

    const { url, init } = firstCall(fetchMock);
    expect(url).toContain("role=STUDENT");
    expect(url).toContain("dry_run=true");
    expect(url).toContain("send_welcome=true");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("threads context_type/context_id and an explicit send_welcome=false", async () => {
    const fetchMock = stubFetch({ dry_run: false, total: 1, rows: [] });
    const file = new File(["x"], "import.csv", { type: "text/csv" });

    await importUsers(file, {
      role: "TEACHER",
      dryRun: false,
      sendWelcome: false,
      context: { type: "partner", id: "pr1" },
    });

    const { url } = firstCall(fetchMock);
    expect(url).toContain("send_welcome=false");
    expect(url).toContain("context_type=partner");
    expect(url).toContain("context_id=pr1");
  });
});

describe("adminService.downloadImportTemplate — blob save flow", () => {
  beforeEach(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:mock");
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it("fetches the per-role template and triggers a blob download", async () => {
    const fetchMock = stubFetch("binary-xlsx-bytes", 200);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await downloadImportTemplate("STUDENT");

    const { url } = firstCall(fetchMock);
    expect(url).toContain("/admin/users/import/template?role=STUDENT");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    clickSpy.mockRestore();
  });
});
