import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Vitest does not run the Next compiler, so `process.env.NEXT_PUBLIC_*` stays a
 * live property access rather than an inlined literal. That is what makes
 * stubEnv + resetModules + dynamic re-import genuinely re-evaluate the module's
 * load-time configuration, which is the only thing worth testing here.
 */

const MVP = "http://localhost:0/test-api"; // what vitest.config.ts sets
const NEW = "https://new.example";

async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("../adminApiRouting");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  // Explicit: `unstubEnvs` is not set in vitest.config.ts.
  vi.unstubAllEnvs();
  vi.resetModules();
});

const EVERY_GROUP = "accounts,schools,analytics,ingestions";

const ALL_PATHS = [
  "/admin/stats",
  "/admin/users?page=1&page_size=25",
  "/admin/users/u1",
  "/admin/users/import?role=STUDENT",
  "/admin/users/import/template?role=STUDENT",
  "/admin/students",
  "/admin/parents",
  "/admin/partners",
  "/admin/teachers",
  "/admin/teacher-students",
  "/admin/enrollments",
  "/admin/analytics/meta",
  "/admin/ingestions",
  "/admin/devices",
  "/admin/agents",
  "/admin/wakeword-models",
  "/lab/devices/d1/logs",
];

const EVERY_METHOD = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"] as const;

describe("the default is the MVP", () => {
  // The single most important test in this file. If the new backend has no
  // URL, nothing may leave the MVP no matter how the group lists are set.
  it("routes everything to the MVP when the new base is unset", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: "",
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: EVERY_GROUP,
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: EVERY_GROUP,
    });

    for (const path of ALL_PATHS) {
      for (const method of EVERY_METHOD) {
        expect(r.adminApiBase(path, method)).toBe(MVP);
      }
    }
  });

  it("routes everything to the MVP when no groups are enabled", async () => {
    const r = await load({ NEXT_PUBLIC_ADMIN_API_URL: NEW });
    for (const path of ALL_PATHS) {
      expect(r.adminApiBase(path, "GET")).toBe(MVP);
    }
  });

  it("keeps unrouted paths on the MVP even with every group enabled", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: EVERY_GROUP,
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: EVERY_GROUP,
    });

    for (const path of [
      "/admin/devices",
      "/admin/devices/stats",
      "/admin/agents",
      "/admin/wakeword-models",
      "/admin/lab/stats",
      "/lab/devices/d1/logs",
      "/admin/something-invented-later",
    ]) {
      expect(r.adminGroupForPath(path)).toBeNull();
      expect(r.adminApiBase(path, "GET")).toBe(MVP);
    }
  });
});

describe("groups", () => {
  it("moves only the enabled group's reads", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
    });

    expect(r.adminApiBase("/admin/users?page=1", "GET")).toBe(NEW);
    expect(r.adminApiBase("/admin/stats", "GET")).toBe(NEW);
    expect(r.adminApiBase("/admin/partners", "GET")).toBe(MVP);
    expect(r.adminApiBase("/admin/analytics/meta", "GET")).toBe(MVP);
  });

  it("holds writes back until the write list names the group", async () => {
    const readsOnly = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
    });
    expect(readsOnly.adminApiBase("/admin/users/u1", "GET")).toBe(NEW);
    expect(readsOnly.adminApiBase("/admin/users/u1", "PATCH")).toBe(MVP);
    expect(readsOnly.adminApiBase("/admin/users/u1", "DELETE")).toBe(MVP);

    const withWrites = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: "accounts",
    });
    expect(withWrites.adminApiBase("/admin/users/u1", "PATCH")).toBe(NEW);
  });

  // A write group without its read group is a misconfiguration, and the safe
  // reading of a misconfiguration is "stay on the MVP".
  it("ignores a write group that has no matching read group", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "",
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: "accounts",
    });
    expect(r.adminApiBase("/admin/users", "POST")).toBe(MVP);
    expect(r.ADMIN_ROUTING.writeGroups.size).toBe(0);
  });

  it("drops unknown group tokens and tolerates stray commas", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts, wakeword ,,devices,",
    });
    expect([...r.ADMIN_ROUTING.readGroups]).toEqual(["accounts"]);
    expect(r.adminApiBase("/admin/users", "GET")).toBe(NEW);
    expect(r.adminApiBase("/admin/devices", "GET")).toBe(MVP);
  });
});

describe("path matching", () => {
  it("tells apart the near-miss pairs", async () => {
    const r = await load({ NEXT_PUBLIC_ADMIN_API_URL: NEW });

    // Two characters apart, different groups.
    expect(r.adminGroupForPath("/admin/parents")).toBe("accounts");
    expect(r.adminGroupForPath("/admin/partners")).toBe("schools");

    expect(r.adminGroupForPath("/admin/teachers")).toBe("schools");
    expect(r.adminGroupForPath("/admin/teacher-students")).toBe("schools");

    // /admin/stats is an accounts route; /admin/devices/stats is not routed.
    expect(r.adminGroupForPath("/admin/stats")).toBe("accounts");
    expect(r.adminGroupForPath("/admin/devices/stats")).toBeNull();
  });

  it("matches on segments, not bare prefixes", async () => {
    const r = await load({ NEXT_PUBLIC_ADMIN_API_URL: NEW });
    expect(r.adminGroupForPath("/admin/users/u1")).toBe("accounts");
    expect(r.adminGroupForPath("/admin/users-archive")).toBeNull();
    expect(r.adminGroupForPath("/admin/partners-pending")).toBeNull();
  });

  it("ignores the query string when matching but keeps it in the URL", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
    });

    expect(r.adminGroupForPath("/admin/users?role=TEACHER&page=2")).toBe("accounts");
    expect(r.adminUrl("/admin/users?role=TEACHER&page=2", "GET")).toBe(
      `${NEW}/admin/users?role=TEACHER&page=2`,
    );
  });

  it("puts every analytics endpoint in the analytics group", async () => {
    const r = await load({ NEXT_PUBLIC_ADMIN_API_URL: NEW });
    for (const path of [
      "/admin/analytics/meta",
      "/admin/analytics/dims/values",
      "/admin/analytics/funnel?range=28d",
      "/admin/analytics/panels/onboarding?range=28d",
      "/admin/analytics/panels/journey-summary?range=28d",
      "/admin/analytics/metrics/ACQ-02/series",
      "/admin/analytics/diagnostics/PLC-02",
    ]) {
      expect(r.adminGroupForPath(path)).toBe("analytics");
    }
  });
});

describe("the bulk-import flow stays on one backend", () => {
  // The template GET and the upload POST must agree, or the console hands out
  // a template generated by one service and posts it to another.
  it("keeps the template on the MVP while only reads are enabled", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
    });

    expect(r.adminApiBase("/admin/users/import/template?role=STUDENT", "GET")).toBe(MVP);
    expect(r.adminApiBase("/admin/users/import?role=STUDENT", "POST")).toBe(MVP);
    // ...while the ordinary accounts reads have already moved.
    expect(r.adminApiBase("/admin/users", "GET")).toBe(NEW);
  });

  it("moves both together once writes are enabled", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: "accounts",
    });

    expect(r.adminApiBase("/admin/users/import/template?role=STUDENT", "GET")).toBe(NEW);
    expect(r.adminApiBase("/admin/users/import?role=STUDENT", "POST")).toBe(NEW);
  });
});

describe("base URLs", () => {
  it("strips a trailing slash so the path never doubles it", async () => {
    const r = await load({
      NEXT_PUBLIC_ADMIN_API_URL: `${NEW}/`,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
    });
    expect(r.adminUrl("/admin/stats", "GET")).toBe(`${NEW}/admin/stats`);
  });
});

describe("the rule table", () => {
  // Guards the ordering for whoever adds a row next: a rule may not be
  // shadowed by an earlier, broader one.
  it("is ordered so no rule is unreachable", async () => {
    const r = await load();
    r.ADMIN_ROUTE_RULES.forEach((rule, index) => {
      const shadowed = r.ADMIN_ROUTE_RULES.slice(0, index).find(
        (earlier) =>
          rule.prefix === earlier.prefix || rule.prefix.startsWith(`${earlier.prefix}/`),
      );
      expect(
        shadowed,
        `"${rule.prefix}" is unreachable: "${shadowed?.prefix}" matches it first`,
      ).toBeUndefined();
    });
  });

  it("names only known groups", async () => {
    const r = await load();
    const groups = new Set(r.ADMIN_ROUTE_RULES.map((rule) => rule.group));
    expect([...groups].sort()).toEqual(["accounts", "analytics", "ingestions", "schools"]);
  });
});

describe("adminAuthBase", () => {
  // The console's login was the last thing tying it to the MVP: every screen could be moved and the MVP would
  // still have to run, because that is where an admin signs in.
  it("signs in against the MVP until a host is configured", async () => {
    const { adminAuthBase } = await load({ NEXT_PUBLIC_ADMIN_AUTH_URL: "" });

    expect(adminAuthBase()).toBe(MVP);
  });

  it("signs in against the configured host once there is one", async () => {
    const { adminAuthBase } = await load({ NEXT_PUBLIC_ADMIN_AUTH_URL: NEW });

    expect(adminAuthBase()).toBe(NEW);
  });

  it("is separate from where the admin's API calls go", async () => {
    // Deliberately two variables. Moving the screens and moving the login are different decisions, and either
    // can be undone without the other.
    const { adminAuthBase, adminApiBase } = await load({
      NEXT_PUBLIC_ADMIN_AUTH_URL: NEW,
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "",
    });

    expect(adminAuthBase()).toBe(NEW);
    expect(adminApiBase("/admin/users", "GET")).toBe(MVP);
  });

  it("strips a trailing slash, like every other base", async () => {
    const { adminAuthBase } = await load({ NEXT_PUBLIC_ADMIN_AUTH_URL: `${NEW}/` });

    expect(adminAuthBase()).toBe(NEW);
  });
});

/**
 * The subject catalogue (`/rag/taxonomy/subjects`) is reference data, not an
 * `/admin/*` path, so the rule table never claimed it and it fell through to the
 * MVP however many groups had moved. Phase 7 caught it in the browser: with the
 * MVP stopped, the catalogue came back empty and the Create-account modal showed
 * *no subject chips at all*, so an admin could not give a new TEACHER a subject.
 *
 * Both stacks serve it identically, so this follows the migration as a whole
 * rather than any one group.
 */
describe("adminReferenceBase", () => {
  it("stays on the MVP when no group has moved", async () => {
    const { adminReferenceBase } = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "",
    });
    expect(adminReferenceBase()).toBe(MVP);
  });

  it("stays on the MVP when there is no new backend configured", async () => {
    const { adminReferenceBase } = await load({
      NEXT_PUBLIC_ADMIN_API_URL: "",
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: EVERY_GROUP,
    });
    expect(adminReferenceBase()).toBe(MVP);
  });

  it("moves as soon as any one group has moved", async () => {
    const { adminReferenceBase } = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "accounts",
    });
    expect(adminReferenceBase()).toBe(NEW);
  });

  it("is on the new backend once every group has", async () => {
    const { adminReferenceBase } = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: EVERY_GROUP,
    });
    expect(adminReferenceBase()).toBe(NEW);
  });

  it("ignores the write list — the catalogue is only ever read", async () => {
    const { adminReferenceBase } = await load({
      NEXT_PUBLIC_ADMIN_API_URL: NEW,
      NEXT_PUBLIC_ADMIN_BACKEND_GROUPS: "analytics",
      NEXT_PUBLIC_ADMIN_BACKEND_WRITE_GROUPS: "",
    });
    expect(adminReferenceBase()).toBe(NEW);
  });
});
