import type { ReactNode } from "react";
import type { MomentArtSrc } from "@/features/student/theme/momentArt";
import { MomentArt } from "./MomentArt";

/** A full-page moment (404, route error): one illustration, a short line, and the way out. */
export function MomentPage({ art, title, body, children }: { art: MomentArtSrc; title: string; body: string; children: ReactNode }) {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center"
      style={{ background: "var(--paper)" }}
    >
      <MomentArt art={art} width={330} float className="max-w-full" />
      <h1 className="m-0 mt-4 text-[26px] font-extrabold text-[var(--primary-ink)]" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h1>
      <p className="m-0 mt-2 max-w-[38ch] text-[15px] leading-relaxed text-[var(--primary-ink)]/70">{body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
    </main>
  );
}
