"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  /** `md` for sign-in/forgot-password, `xl` for the taller sign-up form. */
  width?: "md" | "xl";
  children: ReactNode;
}

/**
 * Single self-contained auth card: logo, title, form and copyright all live
 * inside one surface floating on the tiled doodle canvas. There is no page
 * navbar or page footer — the whole screen fits one viewport, and the form
 * region scrolls inside the card when it is too tall (sign-up) so the frame
 * itself never moves.
 */
export function AuthShell({ title, subtitle, width = "md", children }: AuthShellProps) {
  return (
    <div className="auth-canvas min-h-screen flex items-center justify-center px-4 py-6">
      <div
        className={`w-full ${
          width === "xl" ? "max-w-xl" : "max-w-md"
        } max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden rounded-[28px] border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(4,46,92,0.28)]`}
      >
        {/* Logo + title, inside the card */}
        <div className="shrink-0 px-8 pt-8 pb-5 sm:px-10 text-center">
          <Link href="/" className="inline-block transition-opacity hover:opacity-80">
            <Image src="/GenEd Logo Colored.svg" alt="GenEd" width={104} height={38} priority />
          </Link>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#042E5C]">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm font-medium text-[#2D3E51]/55">{subtitle}</p>
          ) : null}
        </div>

        {/* Form region — the only part that scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6 sm:px-10">{children}</div>

        {/* Copyright, inside the card */}
        <div className="shrink-0 border-t border-[#042e5c]/8 px-8 py-3.5 sm:px-10 text-center text-[11px] font-medium text-[#2D3E51]/40">
          &copy; {new Date().getFullYear()} GenEd. All rights reserved.
        </div>
      </div>
    </div>
  );
}
