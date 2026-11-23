"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

// The auth pages' own field look (SignIn.tsx), so the invite forms sit on the login backdrop as siblings of the sign-in card.
export const LABEL = "block text-[9px] font-bold uppercase tracking-[0.28em] text-[#1D6315]/45 mb-2 pl-0.5";
export const INPUT =
  "w-full rounded-xl border px-5 py-3.5 text-sm text-[#1D6315] transition-all duration-200 placeholder:text-[#1D6315]/25 hover:border-[#287624]/40 focus:border-[#287624] focus:outline-none focus:ring-2 focus:ring-[#287624]/15";
export const inputTone = (bad: boolean) => (bad ? "border-rose-400 bg-rose-50/30" : "border-[#1D6315]/15 bg-white/70");

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1">
      {children}
    </p>
  );
}

/**
 * A pill toggle around a native radio/checkbox: keyboard, screen readers and form semantics come for free.
 * `relative` keeps the sr-only (absolutely positioned) input inside the pill: without it the input escapes the
 * card's scrolling region, and focusing it scrolls the whole card out from under its header.
 */
export function Chip({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#287624]/30 ${
        checked
          ? "border-[#287624] bg-[#287624] text-white shadow-[0_6px_16px_-8px_rgba(40,118,36,0.8)]"
          : "border-[#1D6315]/15 bg-white/70 text-[#1D6315]/75 hover:border-[#287624]/40 hover:text-[#1D6315]"
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && type === "checkbox" ? <Check size={13} strokeWidth={3} aria-hidden /> : null}
      {children}
    </label>
  );
}

export function ChipGroup({ legend, error, children }: { legend: string; error?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className={LABEL}>{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      <FieldError>{error}</FieldError>
    </fieldset>
  );
}

/** A labelled text input with its error line. */
export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  prefix,
  className = "",
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  /** Fixed text shown inside the field's left edge, e.g. "+91". */
  prefix?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange" | "prefix">) {
  const input = (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className={`${INPUT} ${prefix ? "pl-14" : ""} ${inputTone(!!error)} ${className}`}
      {...rest}
    />
  );
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {prefix ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#1D6315]/45">
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** "Yes, contact me on WhatsApp" — the one checkbox both invite forms need ticked. */
export function ConsentField({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 pl-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#1D6315]/20 accent-[#287624]"
        />
        <span className="text-sm font-medium leading-snug text-[#3B5533]/70">
          Yes, GenEd can contact me on WhatsApp about my invite and ask for feedback.
        </span>
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** The green tick + "You're on the list!" card both forms end on. */
export function DoneCard({ message, children }: { message: ReactNode; children?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center py-6 text-center animate-in fade-in zoom-in-95">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#287624] text-white shadow-[0_12px_30px_-10px_rgba(40,118,36,0.75)]">
        <Check size={30} strokeWidth={3} aria-hidden />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-[#1D6315]">You&apos;re on the list!</h2>
      <p className="mt-1.5 max-w-xs text-sm font-medium text-[#3B5533]/60">{message}</p>
      <div className="mt-7 flex w-full flex-col gap-3">{children}</div>
    </div>
  );
}

export function SendError() {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50/80 px-5 py-3.5 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2"
    >
      Couldn&apos;t send. Please check your connection and try again.
    </div>
  );
}

/** Indian mobile: 10 digits starting 6–9. */
export const isIndianMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits);
