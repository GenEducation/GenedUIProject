#!/usr/bin/env node
/**
 * admin-parity-smoke.mjs
 *
 * Side-by-side smoke check for the admin console migration (step 0.7 of
 * gened-admin-migration-plan-2026-10-12.md): sends the SAME read-only admin
 * requests to the MVP gateway and to the new gateway and reports where the
 * answers disagree.
 *
 * Why this exists:
 *   - A route may only move to the new backend once it returns the same JSON
 *     the MVP returns. `backend/tools/parity/` proves that against synthetic
 *     databases; this proves it against the REAL dev data the admins look at,
 *     through the real gateways, with a real admin token.
 *   - It runs before a group is switched on, and again after, as the gate
 *     evidence for each phase.
 *
 * GET ONLY. Every request is a GET and the script refuses to send anything
 * else — it must be safe to point at production. It never writes, never
 * follows a link out of a response, and never prints the token.
 *
 * Usage:
 *   ADMIN_TOKEN=... MVP_BASE=https://<mvp> NEW_BASE=https://<new> \
 *     ADMIN_GROUPS=accounts node scripts/admin-parity-smoke.mjs
 *
 * Environment:
 *   ADMIN_TOKEN     required. An ADMIN JWT, obtained by signing in to the
 *                   admin console. Read from the environment only; do not put
 *                   it in a file, a shell history entry or a commit.
 *   MVP_BASE        required. Origin of the MVP gateway, no trailing slash.
 *   NEW_BASE        required. Origin of the new gateway, no trailing slash.
 *   ADMIN_GROUPS    comma-separated, default "accounts". One or more of
 *                   accounts, schools, analytics — or "all".
 *                   These are the §4 routing groups, so the value matches what
 *                   you are about to put in NEXT_PUBLIC_ADMIN_BACKEND_GROUPS.
 *                   NOT named GROUPS: that is a readonly special array in bash,
 *                   so `GROUPS=schools node …` is silently dropped and you would
 *                   be checking "accounts" while believing you checked "schools".
 *   SAMPLE          default 3. How many ids to follow from each list response
 *                   into its detail route.
 *   IGNORE_FIELDS   comma-separated extra response keys to ignore everywhere,
 *                   on top of the volatile ones below.
 *   TIMEOUT_MS      default 15000, per request.
 *
 * Exit code: 0 when the group is safe to enable, 1 when anything blocks it, 2
 * on a setup error. Order-only differences do not block.
 *
 * Reading the output:
 *   PASS  same        both gateways returned the same status and the same body.
 *   WARN  order only  same members, different order. Not a contract break for
 *                     an unordered collection, but the admin sees a different
 *                     row order, so it is reported rather than hidden. Does
 *                     not block.
 *   TODO  MVP ONLY    the new gateway does not serve this route yet (404/405
 *                     where the MVP answered). Expected for a group that has
 *                     not been ported, and blocking for one you are about to
 *                     enable — which is the only reason to run this.
 *   FAIL  DIFFERS     a real difference, shown as the JSON paths that disagree.
 *   TODO  NO EVIDENCE both sides failed the same way (commonly 401 from an
 *                     expired token). Blocking: matching errors say nothing
 *                     about whether the route is ready.
 *   FAIL  ERROR       a gateway could not be reached.
 */

const REQUIRED = ["ADMIN_TOKEN", "MVP_BASE", "NEW_BASE"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment: ${missing.join(", ")}`);
  console.error("See the header of this file for usage.");
  process.exit(2);
}

const TOKEN = process.env.ADMIN_TOKEN;
const MVP_BASE = process.env.MVP_BASE.replace(/\/+$/, "");
const NEW_BASE = process.env.NEW_BASE.replace(/\/+$/, "");
const SAMPLE = Number(process.env.SAMPLE ?? 3);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 15000);

/**
 * Keys whose values differ between two servers by construction. Deliberately
 * short: both gateways read the SAME database, so unlike the backend's own
 * parity harness we do NOT mask ids and do NOT ignore created_at/updated_at —
 * the same row must come back with the same id and the same timestamps. A
 * difference in those is a real finding, not noise.
 */
const VOLATILE = new Set([
  "request_id",
  "trace_id",
  "timestamp",
  "generated_at",
  "served_at",
  ...String(process.env.IGNORE_FIELDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]);

// ── What to check, per routing group ───────────────────────────
//
// Paths are the rows of §3 of the plan that are GETs. `kind: "text"` is for
// responses that are not JSON (the import template is a CSV).
//
// `follow` turns a list response into detail checks: `ids` pulls identifiers
// out of the list body, and `detail` makes the paths to try for each one. The
// list is fetched from the MVP, so both sides are asked about the same ids.

const GROUPS = {
  accounts: {
    checks: [
      { name: "stats", path: "/admin/stats" },
      { name: "users page 1", path: "/admin/users?page=1&page_size=25" },
      { name: "students", path: "/admin/students" },
      { name: "parents", path: "/admin/parents" },
      {
        name: "import template (STUDENT)",
        path: "/admin/users/import/template?role=STUDENT",
        kind: "text",
      },
      {
        name: "import template (PARENT)",
        path: "/admin/users/import/template?role=PARENT",
        kind: "text",
      },
      {
        name: "import template (PARTNER)",
        path: "/admin/users/import/template?role=PARTNER",
        kind: "text",
      },
    ],
    follow: [
      {
        from: "/admin/users?page=1&page_size=25",
        ids: (b) => (b?.items ?? []).map((r) => r?.id),
        detail: (id) => [
          { name: `user ${id}`, path: `/admin/users/${encodeURIComponent(id)}` },
        ],
      },
    ],
  },

  schools: {
    checks: [
      { name: "partners", path: "/admin/partners" },
      { name: "teachers", path: "/admin/teachers" },
      { name: "teacher-students", path: "/admin/teacher-students" },
      { name: "enrollments", path: "/admin/enrollments" },
    ],
    follow: [],
  },

  // The six Learning Signal endpoints. Read-only on both sides, and the rows
  // come from the same tables, so these must match exactly.
  analytics: {
    checks: [
      { name: "analytics meta", path: "/admin/analytics/meta" },
      { name: "analytics dims", path: "/admin/analytics/dims/values" },
      { name: "funnel", path: "/admin/analytics/funnel?range=28d" },
      { name: "panel onboarding", path: "/admin/analytics/panels/onboarding?range=28d" },
      { name: "panel placement", path: "/admin/analytics/panels/placement?range=28d" },
      { name: "panel activation", path: "/admin/analytics/panels/activation?range=28d" },
      {
        name: "journey summary",
        path: "/admin/analytics/panels/journey-summary?range=28d",
      },
    ],
    follow: [
      {
        from: "/admin/analytics/meta",
        ids: (b) => (Array.isArray(b) ? b : []).map((m) => m?.metric_id),
        detail: (id) => [
          {
            name: `metric series ${id}`,
            path: `/admin/analytics/metrics/${encodeURIComponent(id)}/series?range=28d`,
          },
        ],
      },
    ],
  },
};

const requested = String(process.env.ADMIN_GROUPS ?? "accounts")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const selected = requested.includes("all") ? Object.keys(GROUPS) : requested;
const unknown = selected.filter((g) => !(g in GROUPS));
if (unknown.length) {
  console.error(`Unknown group(s): ${unknown.join(", ")}`);
  console.error(`Known groups: ${Object.keys(GROUPS).join(", ")}, all`);
  console.error(
    "ingestions has no group here: the new screen is a rebuild on the worker's\n" +
      "source API, not a port, so there is no MVP response to compare it against.",
  );
  console.error("Set them in ADMIN_GROUPS (not GROUPS — bash reserves that name).");
  process.exit(2);
}

// ── Fetching ───────────────────────────────────────────────────

/** One GET against one base. Never anything but a GET. */
async function get(base, path, kind) {
  if (!path.startsWith("/")) throw new Error(`path must start with "/": ${path}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "*/*" },
      redirect: "manual",
      signal: controller.signal,
    });
    const raw = await res.text();
    if (kind === "text") return { status: res.status, body: raw };
    try {
      return { status: res.status, body: raw ? JSON.parse(raw) : null };
    } catch {
      return { status: res.status, body: raw };
    }
  } catch (e) {
    return { status: 0, body: null, error: String(e?.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}

// ── Comparing ──────────────────────────────────────────────────

/** Drop volatile keys, recursively. Ids and timestamps are kept on purpose. */
function normalise(value) {
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (!VOLATILE.has(k)) out[k] = normalise(v);
    }
    return out;
  }
  return value;
}

/**
 * Sort the members of an UNORDERED collection so an order-only difference can
 * be told apart from a content one.
 *
 * Only bare top-level arrays are sorted. A paginated payload's `items` is left
 * alone: its order is server-side, part of the contract (`sort` is echoed back
 * in the fleet response), and sorting it here would hide a real regression.
 */
function sortUnordered(value) {
  if (!Array.isArray(value)) return value;
  return [...value].sort((a, b) => key(a).localeCompare(key(b)));
}

function key(row) {
  if (row && typeof row === "object") {
    const k = row.id ?? row.fleet_key ?? row.serial ?? row.email ?? row.username;
    if (k != null) return String(k);
  }
  return JSON.stringify(row ?? null);
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Up to `limit` JSON paths where the two bodies disagree. */
function diffPaths(a, b, prefix = "", out = [], limit = 12) {
  if (out.length >= limit) return out;
  if (eq(a, b)) return out;

  const bothArrays = Array.isArray(a) && Array.isArray(b);
  const bothObjects =
    a && b && typeof a === "object" && typeof b === "object" && !bothArrays;

  if (bothArrays) {
    if (a.length !== b.length) {
      out.push(`${prefix || "(root)"}: ${a.length} items on MVP, ${b.length} on new`);
      return out;
    }
    for (let i = 0; i < a.length && out.length < limit; i++) {
      diffPaths(a[i], b[i], `${prefix}[${i}]`, out, limit);
    }
    return out;
  }

  if (bothObjects) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (out.length >= limit) break;
      if (!(k in a)) out.push(`${prefix}.${k}: missing on MVP, new has ${show(b[k])}`);
      else if (!(k in b)) out.push(`${prefix}.${k}: MVP has ${show(a[k])}, missing on new`);
      else diffPaths(a[k], b[k], `${prefix}.${k}`, out, limit);
    }
    return out;
  }

  out.push(`${prefix || "(root)"}: MVP ${show(a)} / new ${show(b)}`);
  return out;
}

function show(v) {
  const s = typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v ?? null);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

// ── Running ────────────────────────────────────────────────────

async function runCheck(check) {
  const [mvp, nw] = await Promise.all([
    get(MVP_BASE, check.path, check.kind),
    get(NEW_BASE, check.path, check.kind),
  ]);

  if (mvp.error || nw.error) {
    const which = mvp.error ? `MVP (${mvp.error})` : `new (${nw.error})`;
    return { verdict: "ERROR", note: `could not reach ${which}`, paths: [] };
  }

  if (mvp.status < 400 && (nw.status === 404 || nw.status === 405)) {
    return {
      verdict: "MVP ONLY",
      note: `MVP ${mvp.status}, new ${nw.status} — route not served yet`,
      paths: [],
    };
  }

  if (mvp.status !== nw.status) {
    return {
      verdict: "DIFFERS",
      note: `status: MVP ${mvp.status}, new ${nw.status}`,
      paths: diffPaths(normalise(mvp.body), normalise(nw.body)),
    };
  }

  const a = normalise(mvp.body);
  const b = normalise(nw.body);

  // Two matching failures are not parity. An expired token (401 on both) or a
  // route neither side serves would otherwise be counted as a pass, and a gate
  // signed off on "9/9 matched" that was really nine 401s.
  if (mvp.status >= 400 && eq(a, b)) {
    return {
      verdict: "NO EVIDENCE",
      note: `both returned ${mvp.status}; this proves nothing about parity`,
      paths: [],
    };
  }

  if (eq(a, b)) return { verdict: "same", note: `${mvp.status}`, paths: [] };

  if (eq(sortUnordered(a), sortUnordered(b))) {
    return {
      verdict: "order only",
      note: `${mvp.status}, same members in a different order`,
      paths: [],
    };
  }

  return { verdict: "DIFFERS", note: `${mvp.status}`, paths: diffPaths(a, b) };
}

const TAGS = {
  same: "PASS",
  "order only": "WARN",
  "MVP ONLY": "TODO",
  "NO EVIDENCE": "TODO",
  DIFFERS: "FAIL",
  ERROR: "FAIL",
};

function line(name, { verdict, note, paths }) {
  console.log(`${TAGS[verdict]}  ${name}: ${verdict}${note ? ` (${note})` : ""}`);
  for (const p of paths) console.log(`        ${p}`);
}

async function main() {
  console.log(`MVP  ${MVP_BASE}`);
  console.log(`new  ${NEW_BASE}`);
  console.log(`groups: ${selected.join(", ")}  (GET only, no writes)\n`);

  const tally = {
    same: 0,
    "order only": 0,
    "MVP ONLY": 0,
    "NO EVIDENCE": 0,
    DIFFERS: 0,
    ERROR: 0,
  };
  const record = (check, result) => {
    tally[result.verdict]++;
    line(check.name, result);
  };

  for (const group of selected) {
    console.log(`── ${group} ─────────────────────────────`);
    const { checks, follow } = GROUPS[group];

    for (const check of checks) {
      record(check, await runCheck(check));
    }

    // Detail routes, for ids that actually exist in this environment.
    for (const f of follow) {
      const listed = await get(MVP_BASE, f.from);
      if (listed.status >= 400 || listed.error) {
        console.log(`SKIP  detail routes from ${f.from}: MVP returned ${listed.status}`);
        continue;
      }
      const ids = (f.ids(listed.body) ?? []).filter(Boolean).slice(0, SAMPLE);
      if (!ids.length) {
        console.log(`SKIP  detail routes from ${f.from}: no rows to sample`);
        continue;
      }
      for (const id of ids) {
        for (const check of f.detail(id)) {
          record(check, await runCheck(check));
        }
      }
    }
    console.log("");
  }

  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const parts = [`${tally.same}/${total} matched`];
  if (tally["order only"]) parts.push(`${tally["order only"]} order-only`);
  if (tally["MVP ONLY"]) parts.push(`${tally["MVP ONLY"]} not served by the new gateway`);
  if (tally["NO EVIDENCE"]) parts.push(`${tally["NO EVIDENCE"]} failed on both sides`);
  if (tally.DIFFERS) parts.push(`${tally.DIFFERS} DIFFER`);
  if (tally.ERROR) parts.push(`${tally.ERROR} unreachable`);
  console.log(parts.join(", "));

  // An order-only difference is cosmetic and passes. A missing route is not:
  // the group cannot be enabled until the new gateway serves everything in it.
  const blocking =
    tally.DIFFERS + tally.ERROR + tally["MVP ONLY"] + tally["NO EVIDENCE"];
  if (blocking) {
    console.log(
      `\nDo not enable ${selected.join(", ")}: ${blocking} check(s) must be clean first.`,
    );
  }
  process.exit(blocking ? 1 : 0);
}

main().catch((e) => {
  console.error(`smoke run failed: ${e?.stack ?? e}`);
  process.exit(2);
});
