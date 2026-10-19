import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedAuthLocalStorage } from "@/test/helpers/auth";

/**
 * Proves the call sites are actually wired to adminApiRouting — the routing
 * module's own suite proves the decisions, this one proves they are consulted.
 *
 * It matters most for the three calls that build their URL directly instead of
 * going through `getJson`/`send`: the wake-word download, the import template
 * and the import upload. Those are exactly the ones a rewiring forgets.
 *
 * Stubbing global `fetch` (the pattern adminService.test.ts already uses) also
 * keeps these away from MSW, whose `onUnhandledRequest: "error"` would
 * otherwise fail the run.
 */

const MVP = "http://localhost:0/test-api"; // vitest.config.ts
const NEW = "https://new.example";

function stubFetch(body: unknown = {}, status = 200) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function urlOf(fetchMock: ReturnType<typeof vi.fn>): string {
  return String(fetchMock.mock.calls[0][0]);
}

/** Re-import the service so its load-time routing picks up this case's env. */
async function loadService(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("../adminService");
}

const ACCOUNTS_READS = {
  NEXT_PUBLIC_ADMIN_API_URL: NEW,
  NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
};
const ACCOUNTS_WRITES = {
  ...ACCOUNTS_READS,
  NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: "accounts",
};

beforeEach(() => {
  localStorage.clear();
  seedAuthLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getJson call sites", () => {
  it("sends an enabled group's read to the new backend", async () => {
    const svc = await loadService(ACCOUNTS_READS);
    const fetchMock = stubFetch({ items: [], total: 0 });
    await svc.listUsers({});
    expect(urlOf(fetchMock)).toContain(`${NEW}/admin/users?`);
  });

  it("leaves a group that is not enabled on the MVP", async () => {
    const svc = await loadService(ACCOUNTS_READS);
    const fetchMock = stubFetch([]);
    await svc.listPartners();
    expect(urlOf(fetchMock)).toBe(`${MVP}/admin/partners`);
  });

  it("leaves an unrouted path on the MVP even with every group on", async () => {
    const svc = await loadService({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts,schools,analytics,ingestions",
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: "accounts,schools,analytics,ingestions",
    });
    const fetchMock = stubFetch([]);
    await svc.listAgents();
    expect(urlOf(fetchMock)).toBe(`${MVP}/admin/agents`);
  });
});

describe("send call sites", () => {
  it("holds a write back while only reads are enabled", async () => {
    const svc = await loadService(ACCOUNTS_READS);
    const fetchMock = stubFetch({ message: "ok" });
    await svc.updateUser("u1", { plan: "PRO" });
    expect(urlOf(fetchMock)).toBe(`${MVP}/admin/users/u1`);
  });

  it("moves the write once its group is in the write list", async () => {
    const svc = await loadService(ACCOUNTS_WRITES);
    const fetchMock = stubFetch({ message: "ok" });
    await svc.updateUser("u1", { plan: "PRO" });
    expect(urlOf(fetchMock)).toBe(`${NEW}/admin/users/u1`);
  });
});

// The three that build their own URL. Each is checked separately because each
// is a separate chance to have forgotten one.
describe("the direct authFetch call sites", () => {
  beforeEach(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:mock");
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => {
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it("routes the import template, and keeps it with the upload", async () => {
    const reads = await loadService(ACCOUNTS_READS);
    let fetchMock = stubFetch("bytes");
    await reads.downloadImportTemplate("STUDENT");
    // Reads-only: the template stays with the POST that will consume it.
    expect(urlOf(fetchMock)).toBe(
      `${MVP}/admin/users/import/template?role=STUDENT`,
    );

    const writes = await loadService(ACCOUNTS_WRITES);
    fetchMock = stubFetch("bytes");
    await writes.downloadImportTemplate("STUDENT");
    expect(urlOf(fetchMock)).toBe(
      `${NEW}/admin/users/import/template?role=STUDENT`,
    );
  });

  it("routes the import upload by the write list", async () => {
    const reads = await loadService(ACCOUNTS_READS);
    const file = new File(["email\na@b.invalid\n"], "rows.csv", { type: "text/csv" });

    let fetchMock = stubFetch({ total: 0, rows: [] });
    await reads.importUsers(file, { role: "STUDENT", dryRun: true });
    expect(urlOf(fetchMock)).toContain(`${MVP}/admin/users/import?`);

    const writes = await loadService(ACCOUNTS_WRITES);
    fetchMock = stubFetch({ total: 0, rows: [] });
    await writes.importUsers(file, { role: "STUDENT", dryRun: true });
    expect(urlOf(fetchMock)).toContain(`${NEW}/admin/users/import?`);
  });

  it("keeps the wake-word download on the MVP", async () => {
    const svc = await loadService({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts,schools,analytics,ingestions",
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: "accounts,schools,analytics,ingestions",
    });
    const fetchMock = stubFetch("onnx-bytes");
    await svc.downloadWakewordModel("job-1", "model");
    expect(urlOf(fetchMock)).toBe(`${MVP}/admin/wakeword-models/job-1/download`);
  });
});

describe("analyticsService", () => {
  async function loadAnalytics(env: Record<string, string>) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    // The fresh import also resets the module's memoised meta promise.
    return import("../analytics/analyticsService");
  }

  it("moves with the analytics group", async () => {
    const svc = await loadAnalytics({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "analytics",
    });
    const fetchMock = stubFetch([]);
    await svc.getAnalyticsMeta();
    expect(urlOf(fetchMock)).toBe(`${NEW}/admin/analytics/meta`);
  });

  it("stays on the MVP when another group is enabled", async () => {
    const svc = await loadAnalytics({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
    });
    const fetchMock = stubFetch([]);
    await svc.getAnalyticsMeta();
    expect(urlOf(fetchMock)).toBe(`${MVP}/admin/analytics/meta`);
  });
});
