"use client";

/**
 * Dev-only harness for the parent portal's Settings page. Mounts the real
 * ParentSettingsView inside the portal's theme with the parent store seeded
 * from fixtures (no auth, no backend). 404s in production.
 *
 *   ?scenario=full     two children and a waiting request (default)
 *   ?scenario=new      no children yet
 *   ?scenario=welcome  the first-run "connect your child" popup, one request waiting
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ParentSettingsView } from "@/features/parent/components/settings/ParentSettingsView";
import { ConnectChildDialog } from "@/features/parent/components/settings/ConnectChildDialog";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { PORTAL_THEME } from "@/features/parent/components/home/theme";

const DAY = 864e5;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();

export default function ParentSettingsHarnessPage() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <Suspense>
      <ParentSettingsHarness />
    </Suspense>
  );
}

function ParentSettingsHarness() {
  const param = useSearchParams().get("scenario");
  const scenario = param === "new" || param === "welcome" ? param : "full";
  const linked = useParentStore((s) => s.linkedStudents);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const real = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const api = process.env.NEXT_PUBLIC_API_URL;
      if (!api || !url.startsWith(api)) return real(input, init);
      await new Promise((r) => setTimeout(r, 400));
      // The session lookup names the child in the body, not the URL.
      const who = url + (typeof init?.body === "string" ? init.body : "");
      const body = url.includes("/profile")
        ? { grade: who.includes("s1") ? 7 : 4 }
        : url.includes("session")
          ? { sessions: [{ updated_at: ago(who.includes("s1") ? 0.1 : 3) }] }
          : [];
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    // Decisions just update the fixture list, as the real store would.
    useParentStore.setState({
      parentProfile: { user_id: "p1", username: "priya.s", email: "priya.sharma@example.com", role: "parent", name: "Priya Sharma" },
      linkedStudents:
        scenario === "new"
          ? []
          : scenario === "welcome"
            ? [{ student_id: "s2", parent_id: "p1", status: "PENDING", requested_at: ago(0.05), name: "Kabir Sharma" }]
            : [
              { student_id: "s1", parent_id: "p1", status: "APPROVED", requested_at: ago(42), name: "Aarav Sharma" },
              { student_id: "s4", parent_id: "p1", status: "APPROVED", requested_at: ago(20), name: "Anaya Sharma" },
              { student_id: "s2", parent_id: "p1", status: "PENDING", requested_at: ago(1), name: "Kabir Sharma" },
            ],
      updateStudentStatus: async (id, status) => {
        await new Promise((r) => setTimeout(r, 600));
        useParentStore.setState((s) => ({ linkedStudents: s.linkedStudents.map((c) => (c.student_id === id ? { ...c, status } : c)) }));
      },
      unlinkStudent: async (id) => {
        useParentStore.setState((s) => ({ linkedStudents: s.linkedStudents.filter((c) => c.student_id !== id) }));
      },
      logoutParent: () => window.alert("Log out (harness)"),
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount the page only once the fixtures are in place
    setReady(true);
    return () => {
      window.fetch = real;
    };
  }, [scenario]);

  return (
    <div style={PORTAL_THEME} className="relative isolate min-h-screen bg-[var(--pp-bg)] font-[family-name:var(--font-display)] text-[var(--pp-ink)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-[8%] h-[460px] w-[460px] rounded-full bg-[#9FE3C4]/45 blur-[90px]" />
        <div className="absolute left-[-120px] top-[38%] h-[380px] w-[380px] rounded-full bg-[#D7EA7C]/35 blur-[90px]" />
        <div className="absolute bottom-[-140px] right-[30%] h-[420px] w-[420px] rounded-full bg-[#BBD7FF]/40 blur-[100px]" />
      </div>
      <nav className="flex gap-2 px-4 pt-4 text-[12px] font-semibold lg:px-8">
        {["full", "new", "welcome"].map((s) => (
          <a key={s} href={`?scenario=${s}`} className={`rounded-full px-3 py-1 ${s === scenario ? "bg-[var(--pp-ink)] text-white" : "bg-white/70"}`}>{s}</a>
        ))}
      </nav>
      <main className="px-4 pb-8 pt-3 lg:px-8">
        <div className="mx-auto max-w-[1160px] rounded-[28px] border border-white/60 bg-white/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm sm:p-6 lg:p-7">
          {ready && <ParentSettingsView key={scenario} />}
        </div>
      </main>
      {/* outside the blurred panel: backdrop-filter would trap position: fixed */}
      {ready && scenario === "welcome" && (
        <ConnectChildDialog
          open={welcomeOpen && !linked.some((c) => c.status === "APPROVED")}
          parentName="Priya Sharma"
          email="priya.sharma@example.com"
          pending={linked.filter((c) => c.status === "PENDING")}
          avatars={{}}
          onRefresh={() => {}}
          onDismiss={() => setWelcomeOpen(false)}
        />
      )}
    </div>
  );
}
