"use client";

// The parent portal, recreated from ParentHome.tsx: mint sidebar (Home ·
// Report Card · Settings, PNG icons, learning illustration), greeting + bell in
// the top bar, colour blobs behind a frosted content panel.

import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { BrowserFrame, Reveal, type CameraKey, type Progress } from "../primitives";
import { CHILD, PARENT } from "../filmScript";

const ICON = (name: string) => `/parent-portal/${name}.png`;

export function ParentShell({
  p,
  active,
  url,
  children,
  bare = false,
  camera,
}: {
  p: Progress;
  active: "Home" | "Report Card";
  url: string;
  children: ReactNode;
  /** Report card sits in a plain white box instead of the frosted panel. */
  bare?: boolean;
  camera?: CameraKey[];
}) {
  const nav = [
    { label: "Home", icon: "nav_home" },
    { label: "Report Card", icon: "nav_report_card" },
    { label: "Settings", icon: "nav_settings" },
  ];
  return (
    <BrowserFrame url={url} p={p} camera={camera}>
      {/* eslint-disable @next/next/no-img-element -- static mock art */}
      <div className="gc-app gc-parent">
        <aside className="gc-p-side">
          <img src="/brand/gened-logo-deep-ocean-transparent.png" alt="" className="gc-p-logo" />
          <nav>
            {nav.map((n) => (
              <span key={n.label} className={n.label === active ? "gc-p-nav gc-p-nav-on" : "gc-p-nav"}>
                <img src={ICON(n.icon)} alt="" />
                {n.label}
              </span>
            ))}
          </nav>
          <img src={ICON("student_learning_illustration")} alt="" className="gc-p-illus" />
        </aside>
        <div className="gc-p-main">
          <span className="gc-p-blob gc-p-blob-1" />
          <span className="gc-p-blob gc-p-blob-2" />
          <span className="gc-p-blob gc-p-blob-3" />
          <Reveal p={p} at={[0, 0.06]} y={0.4} className="gc-p-top">
            <div>
              <b>Good evening, {PARENT.name}!</b>
              <small>Here&apos;s how {CHILD.name} is doing on their learning journey.</small>
            </div>
            <span className="gc-p-bell">
              <Bell size="1em" strokeWidth={2} aria-hidden />
            </span>
          </Reveal>
          <div className={bare ? "gc-p-panel gc-p-panel-bare" : "gc-p-panel"}>{children}</div>
        </div>
      </div>
      {/* eslint-enable @next/next/no-img-element */}
    </BrowserFrame>
  );
}

/** A single-colour icon from the report card set, tinted with a CSS mask. */
export function MaskIcon({ src, color, size = "1.2em" }: { src: string; color: string; size?: string }) {
  return (
    <span
      className="gc-mask"
      style={{ width: size, height: size, background: color, WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }}
      aria-hidden
    />
  );
}

/** Mastery bands, exactly as the portal and report card colour them. */
export const BANDS = {
  Advanced: { accent: "#075E63", ink: "#122D30", tint: "#D9F279", wash: ["#F4F9E6", "#FBFCF7"], edge: "#DDEAB4" },
  Proficient: { accent: "#2F7A7E", ink: "#075E63", tint: "#DCEBE7", wash: ["#EEF5F3", "#FAFCFB"], edge: "#D0E3DD" },
  Approaching: { accent: "#F5A50B", ink: "#B7790A", tint: "#FDEFC7", wash: ["#FFF8E8", "#FFFDF7"], edge: "#F8E7BE" },
} as const;
export type Band = keyof typeof BANDS;
