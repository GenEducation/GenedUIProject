import Link from "next/link";
import { ZooviLogo } from "@/components/shared/ZooviLogo";
import { SkylineBuild } from "./SkylineBuild";

/**
 * Stand-in for /register while new sign-ups are paused (see SIGNUP_ENABLED).
 * Same doodle canvas and frosted card as the auth pages, built around a
 * looping skyline-building scene (SkylineBuild).
 */
export function SignupPaused() {
  return (
    <main className="auth-canvas min-h-screen flex items-center justify-center px-4 py-6">
      <div className="sp-card w-full max-w-lg overflow-hidden rounded-[28px] border border-[#1d6315]/10 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(29,99,21,0.28)]">
        <div className="px-6 pt-7 pb-6 sm:px-10 text-center">
          <Link href="/" className="sp-rise inline-block transition-opacity hover:opacity-80" style={{ animationDelay: "0ms" }}>
            <ZooviLogo height={38} priority />
          </Link>

          <div className="sp-rise mt-4" style={{ animationDelay: "90ms" }}>
            <SkylineBuild />
          </div>

          <p
            className="sp-rise mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3A8A2E] [font-family:var(--font-jetbrains-mono),monospace]"
            style={{ animationDelay: "180ms" }}
          >
            Sign-ups &middot; Paused
          </p>
          <h1
            className="sp-rise mt-2 text-[28px] leading-tight sm:text-[34px] font-bold tracking-tight text-[#1D6315]"
            style={{ animationDelay: "240ms" }}
          >
            We&apos;re building something <em className="text-[#3A8A2E]">better</em>.
          </h1>
          <p
            className="sp-rise mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-[#2D3E51]/65"
            style={{ animationDelay: "300ms" }}
          >
            New accounts are on hold while we put the finishing touches on Zoovi.
            Already have an account? You can still log in as usual.
          </p>

          <div className="sp-rise mx-auto mt-6 max-w-xs" style={{ animationDelay: "360ms" }}>
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1D6315]/50 [font-family:var(--font-jetbrains-mono),monospace]">
              <span>Work in progress</span>
              <span className="sp-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
            </div>
            <div
              className="sp-progress mt-2 h-1.5 overflow-hidden rounded-full bg-[#1D6315]/8"
              role="progressbar"
              aria-label="Work in progress"
            >
              <span />
            </div>
          </div>

          <div
            className="sp-rise mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:justify-center"
            style={{ animationDelay: "420ms" }}
          >
            <Link
              href="/pre-order"
              className="rounded-full border border-[#1D6315]/15 px-5 py-2.5 text-sm font-bold text-[#1D6315] transition-colors hover:border-[#1D6315]/35 hover:bg-white"
            >
              Sign up for free pilot
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#3A8A2E] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(5,159,109,0.7)] transition-colors hover:bg-[#048a5d]"
            >
              Log in
            </Link>
          </div>
          <Link
            href="/"
            className="sp-rise mt-4 inline-block text-xs font-semibold text-[#2D3E51]/55 hover:text-[#1D6315] hover:underline"
            style={{ animationDelay: "480ms" }}
          >
            &larr; Back to home
          </Link>
        </div>

        <div className="border-t border-[#1d6315]/8 px-8 py-3.5 text-center text-[11px] font-medium text-[#2D3E51]/40">
          &copy; {new Date().getFullYear()} GenEd. All rights reserved.
        </div>
      </div>
    </main>
  );
}
